import { WhatsAppMessage } from '../../types';

export class WhatsAppService {
  private static readonly BASE_URL = 'https://graph.facebook.com/v18.0';
  private static readonly PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
  private static readonly ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;

  /**
   * Initialize WhatsApp service and validate configuration
   */
  static initialize(): boolean {
    if (!this.PHONE_NUMBER_ID || !this.ACCESS_TOKEN) {
      console.warn('WhatsApp configuration is incomplete. Some features may not work.');
      return false;
    }
    return true;
  }

  /**
   * Send a document via WhatsApp
   */
  static async sendDocument(
    phoneNumber: string,
    documentBlob: Blob,
    filename: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.initialize()) {
        throw new Error('WhatsApp service is not properly configured');
      }

      // First, upload the document to get a media ID
      const mediaId = await this.uploadDocument(documentBlob, filename);

      // Then send the document message
      const messageData = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(phoneNumber),
        type: 'document',
        document: {
          id: mediaId,
          filename: filename,
          caption: caption || `Timetable: ${filename}`,
        },
      };

      const response = await this.sendMessage(messageData);
      
      if (response.messages && response.messages.length > 0) {
        return {
          success: true,
          messageId: response.messages[0].id,
        };
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      console.error('WhatsApp document send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send document via WhatsApp',
      };
    }
  }

  /**
   * Send an image via WhatsApp
   */
  static async sendImage(
    phoneNumber: string,
    imageBlob: Blob,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.initialize()) {
        throw new Error('WhatsApp service is not properly configured');
      }

      // First, upload the image to get a media ID
      const mediaId = await this.uploadImage(imageBlob);

      // Then send the image message
      const messageData = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(phoneNumber),
        type: 'image',
        image: {
          id: mediaId,
          caption: caption || 'Academic Timetable',
        },
      };

      const response = await this.sendMessage(messageData);
      
      if (response.messages && response.messages.length > 0) {
        return {
          success: true,
          messageId: response.messages[0].id,
        };
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      console.error('WhatsApp image send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send image via WhatsApp',
      };
    }
  }

  /**
   * Send a text message via WhatsApp
   */
  static async sendTextMessage(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.initialize()) {
        throw new Error('WhatsApp service is not properly configured');
      }

      const messageData = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(phoneNumber),
        type: 'text',
        text: {
          body: message,
        },
      };

      const response = await this.sendMessage(messageData);
      
      if (response.messages && response.messages.length > 0) {
        return {
          success: true,
          messageId: response.messages[0].id,
        };
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error: any) {
      console.error('WhatsApp text send failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send text via WhatsApp',
      };
    }
  }

  /**
   * Upload document to WhatsApp and get media ID
   */
  private static async uploadDocument(blob: Blob, filename: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('type', blob.type);
    formData.append('messaging_product', 'whatsapp');

    const response = await fetch(
      `${this.BASE_URL}/${this.PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload document');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Upload image to WhatsApp and get media ID
   */
  private static async uploadImage(blob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', blob, 'timetable.png');
    formData.append('type', 'image/png');
    formData.append('messaging_product', 'whatsapp');

    const response = await fetch(
      `${this.BASE_URL}/${this.PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Send message via WhatsApp API
   */
  private static async sendMessage(messageData: any): Promise<any> {
    const response = await fetch(
      `${this.BASE_URL}/${this.PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
        },
        body: JSON.stringify(messageData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send message');
    }

    return response.json();
  }

  /**
   * Format phone number for WhatsApp (must include country code without + sign)
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with +, remove it
    if (phoneNumber.startsWith('+')) {
      cleaned = phoneNumber.substring(1).replace(/\D/g, '');
    }
    
    // If it doesn't start with a country code, assume it's India (+91)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Should be at least 10 digits (without country code) and max 15 digits total
    return formatted.length >= 10 && formatted.length <= 15;
  }

  /**
   * Check if WhatsApp service is available
   */
  static isAvailable(): boolean {
    return !!(this.PHONE_NUMBER_ID && this.ACCESS_TOKEN);
  }

  /**
   * Generate WhatsApp Web URL for manual sharing
   */
  static generateWhatsAppWebURL(phoneNumber: string, message: string): string {
    const formatted = this.formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formatted}?text=${encodedMessage}`;
  }

  /**
   * Get media download URL
   */
  static async getMediaDownloadURL(mediaId: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/${mediaId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.ACCESS_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get media URL');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Failed to get media download URL:', error);
      throw error;
    }
  }

  /**
   * Send timetable with custom message template
   */
  static async sendTimetable(
    phoneNumber: string,
    documentBlob: Blob,
    filename: string,
    options: {
      department?: string;
      semester?: number;
      academicYear?: string;
      format: 'pdf' | 'png';
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { department, semester, academicYear, format } = options;
      
      let caption = '📚 Academic Timetable';
      
      if (department) {
        caption += `\n🏫 Department: ${department}`;
      }
      
      if (semester) {
        caption += `\n📖 Semester: ${semester}`;
      }
      
      if (academicYear) {
        caption += `\n🗓️ Academic Year: ${academicYear}`;
      }
      
      caption += `\n📄 Format: ${format.toUpperCase()}`;
      caption += '\n\nGenerated by Academic Timetable Management System';

      if (format === 'pdf') {
        return await this.sendDocument(phoneNumber, documentBlob, filename, caption);
      } else {
        return await this.sendImage(phoneNumber, documentBlob, caption);
      }
    } catch (error: any) {
      console.error('Failed to send timetable:', error);
      return {
        success: false,
        error: error.message || 'Failed to send timetable',
      };
    }
  }

  /**
   * Batch send to multiple phone numbers
   */
  static async batchSendTimetable(
    phoneNumbers: string[],
    documentBlob: Blob,
    filename: string,
    options: {
      department?: string;
      semester?: number;
      academicYear?: string;
      format: 'pdf' | 'png';
    }
  ): Promise<{
    successful: string[];
    failed: Array<{ phoneNumber: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ phoneNumber: string; error: string }> = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.sendTimetable(phoneNumber, documentBlob, filename, options);
        
        if (result.success) {
          successful.push(phoneNumber);
        } else {
          failed.push({
            phoneNumber,
            error: result.error || 'Unknown error',
          });
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        failed.push({
          phoneNumber,
          error: error.message || 'Failed to send',
        });
      }
    }

    return { successful, failed };
  }
}