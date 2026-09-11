interface NotionTodo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdTime: string;
  lastEditedTime: string;
}

interface NotionPage {
  id: string;
  properties: Record<string, any>;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
}

export class NotionApi {
  private token: string;
  private todosDatabaseId: string;
  private calendarDatabaseId: string;
  private notionVersion = '2025-09-03';

  constructor(token: string, todosDatabaseId: string, calendarDatabaseId: string) {
    this.token = token;
    this.todosDatabaseId = todosDatabaseId;
    this.calendarDatabaseId = calendarDatabaseId;
  }

  /**
   * Make authenticated request to Notion API
   */
  private async apiRequest(path: string, init: RequestInit = {}): Promise<any> {
    if (!this.token) {
      throw new Error('Notion token is not configured');
    }

    const response = await fetch(`https://api.notion.com/v1${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': this.notionVersion,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json() as { message?: string };

    if (!response.ok) {
      throw new Error(data.message || `Notion error: ${response.status}`);
    }

    return data;
  }

  /**
   * Get user ID for current user
   */
  private async getSelfUserId(): Promise<string | null> {
    try {
      const data = await this.apiRequest('/users');
      const person = (data.results || []).find((u: any) => u.type === 'person');
      return person ? person.id : null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Get all todos from Notion database
   */
  async getTodos(): Promise<NotionTodo[]> {
    if (!this.todosDatabaseId) {
      throw new Error('Todos database ID is not configured');
    }

    const data = await this.apiRequest(`/databases/${this.todosDatabaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        sorts: [{ property: 'Created time', direction: 'descending' }]
      })
    });

    return (data.results || []).map((page: NotionPage) => {
      const props = page.properties;

      // Extract properties based on common Notion schema
      let title = 'Untitled';
      let description = '';
      let completed = false;

      // Try different common property names for title
      if (props.Title?.title?.[0]?.plain_text) {
        title = props.Title.title[0].plain_text;
      } else if (props.Name?.title?.[0]?.plain_text) {
        title = props.Name.title[0].plain_text;
      }

      // Try different property names for description
      if (props.Description?.rich_text?.[0]?.plain_text) {
        description = props.Description.rich_text[0].plain_text;
      } else if (props.Notes?.rich_text?.[0]?.plain_text) {
        description = props.Notes.rich_text[0].plain_text;
      }

      // Try different property names for completion status
      if (props.Completed?.checkbox !== undefined) {
        completed = props.Completed.checkbox;
      } else if (props.Done?.checkbox !== undefined) {
        completed = props.Done.checkbox;
      }

      return {
        id: page.id.replace(/-/g, ''),
        title,
        description,
        completed,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };
    });
  }

  /**
   * Create a new todo in Notion
   */
  async createTodo(title: string, description?: string): Promise<NotionTodo> {
    if (!this.todosDatabaseId) {
      throw new Error('Todos database ID is not configured');
    }

    const properties: Record<string, any> = {
      Title: {
        title: [{ text: { content: title } }]
      },
      Completed: {
        checkbox: false
      }
    };

    if (description) {
      properties.Description = {
        rich_text: [{ text: { content: description } }]
      };
    }

    const data = await this.apiRequest('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: this.todosDatabaseId },
        properties
      })
    });

    return {
      id: data.id.replace(/-/g, ''),
      title,
      description: description || '',
      completed: false,
      createdTime: data.created_time,
      lastEditedTime: data.last_edited_time
    };
  }

  /**
   * Update todo in Notion (toggle completion or update text)
   */
  async updateTodo(todoId: string, completed: boolean): Promise<NotionTodo> {
    const pageId = this.formatPageId(todoId);

    const data = await this.apiRequest(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          Completed: {
            checkbox: completed
          }
        }
      })
    });

    const props = data.properties;
    let title = 'Untitled';

    if (props.Title?.title?.[0]?.plain_text) {
      title = props.Title.title[0].plain_text;
    } else if (props.Name?.title?.[0]?.plain_text) {
      title = props.Name.title[0].plain_text;
    }

    return {
      id: data.id.replace(/-/g, ''),
      title,
      completed,
      createdTime: data.created_time,
      lastEditedTime: data.last_edited_time
    };
  }

  /**
   * Delete todo from Notion
   */
  async deleteTodo(todoId: string): Promise<void> {
    const pageId = this.formatPageId(todoId);

    await this.apiRequest(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        archived: true
      })
    });
  }

  /**
   * Create event in calendar database
   */
  async createCalendarEntry(title: string, startTime: string, endTime: string, description?: string): Promise<NotionTodo> {
    if (!this.calendarDatabaseId) {
      throw new Error('Calendar database ID is not configured');
    }

    const properties: Record<string, any> = {
      Title: {
        title: [{ text: { content: title } }]
      }
    };

    if (description) {
      properties.Description = {
        rich_text: [{ text: { content: description } }]
      };
    }

    // Try to add date properties if they exist
    if (properties.Date) {
      properties.Date = {
        date: {
          start: startTime,
          end: endTime
        }
      };
    }

    const data = await this.apiRequest('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: this.calendarDatabaseId },
        properties
      })
    });

    return {
      id: data.id.replace(/-/g, ''),
      title,
      description: description || '',
      completed: false,
      createdTime: data.created_time,
      lastEditedTime: data.last_edited_time
    };
  }

  /**
   * Get all calendar entries from Notion
   */
  async getCalendarEntries(): Promise<NotionTodo[]> {
    if (!this.calendarDatabaseId) {
      throw new Error('Calendar database ID is not configured');
    }

    const data = await this.apiRequest(`/databases/${this.calendarDatabaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        sorts: [{ property: 'Date', direction: 'ascending' }]
      })
    });

    return (data.results || []).map((page: NotionPage) => {
      const props = page.properties;

      let title = 'Untitled';
      if (props.Title?.title?.[0]?.plain_text) {
        title = props.Title.title[0].plain_text;
      } else if (props.Name?.title?.[0]?.plain_text) {
        title = props.Name.title[0].plain_text;
      }

      return {
        id: page.id.replace(/-/g, ''),
        title,
        completed: false,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };
    });
  }

  /**
   * Format page ID for Notion API (add dashes)
   */
  private formatPageId(id: string): string {
    const clean = id.replace(/-/g, '');
    if (clean.length !== 32) {
      return id; // Return as-is if it doesn't match expected length
    }
    return [
      clean.substring(0, 8),
      clean.substring(8, 12),
      clean.substring(12, 16),
      clean.substring(16, 20),
      clean.substring(20, 32)
    ].join('-');
  }
}
