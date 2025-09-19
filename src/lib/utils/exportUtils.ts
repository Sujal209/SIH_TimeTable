import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TimetableEntry, TimeSlot, ExportOptions, DayOfWeek } from '../../types';

export class ExportUtils {
  /**
   * Export timetable as PDF
   */
  static async exportToPDF(
    entries: TimetableEntry[],
    timeSlots: TimeSlot[],
    options: ExportOptions
  ): Promise<Blob> {
    try {
      // Create a temporary HTML element for the timetable
      const timetableElement = this.createTimetableHTML(entries, timeSlots, options);
      document.body.appendChild(timetableElement);

      // Convert to canvas
      const canvas = await html2canvas(timetableElement, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        width: timetableElement.scrollWidth,
        height: timetableElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
      });

      // Remove temporary element
      document.body.removeChild(timetableElement);

      // Create PDF
      const pdf = new jsPDF({
        orientation: options.orientation,
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = options.orientation === 'landscape' ? 297 : 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add title if provided
      if (options.title) {
        pdf.setFontSize(16);
        pdf.text(options.title, imgWidth / 2, 15, { align: 'center' });
      }

      const yOffset = options.title ? 25 : 10;
      
      // Check if image fits on one page
      const maxHeight = (options.orientation === 'landscape' ? 210 : 297) - yOffset - 10;
      
      if (imgHeight <= maxHeight) {
        // Single page
        pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth - 20, imgHeight);
      } else {
        // Multiple pages
        let remainingHeight = imgHeight;
        let currentY = 0;
        let pageNumber = 1;

        while (remainingHeight > 0) {
          const pageHeight = Math.min(maxHeight, remainingHeight);
          const sourceY = currentY * (canvas.height / imgHeight);
          const sourceHeight = pageHeight * (canvas.height / imgHeight);

          // Create canvas for this page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            
            if (pageNumber > 1) {
              pdf.addPage();
            }

            if (options.title && pageNumber === 1) {
              pdf.setFontSize(16);
              pdf.text(options.title, imgWidth / 2, 15, { align: 'center' });
            }

            pdf.addImage(pageImgData, 'PNG', 10, pageNumber === 1 ? yOffset : 10, imgWidth - 20, pageHeight);
          }

          currentY += pageHeight;
          remainingHeight -= pageHeight;
          pageNumber++;
        }
      }

      // Add metadata
      pdf.setProperties({
        title: options.title || 'Academic Timetable',
        subject: 'Academic Timetable',
        author: 'Academic Timetable Management System',
        creator: 'Academic Timetable Management System',
      });

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to export PDF');
    }
  }

  /**
   * Export timetable as PNG
   */
  static async exportToPNG(
    entries: TimetableEntry[],
    timeSlots: TimeSlot[],
    options: ExportOptions
  ): Promise<Blob> {
    try {
      // Create a temporary HTML element for the timetable
      const timetableElement = this.createTimetableHTML(entries, timeSlots, options);
      document.body.appendChild(timetableElement);

      // Convert to canvas
      const canvas = await html2canvas(timetableElement, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        width: timetableElement.scrollWidth,
        height: timetableElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
      });

      // Remove temporary element
      document.body.removeChild(timetableElement);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob || new Blob());
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('PNG export failed:', error);
      throw new Error('Failed to export PNG');
    }
  }

  /**
   * Create HTML element for timetable rendering
   */
  private static createTimetableHTML(
    entries: TimetableEntry[],
    timeSlots: TimeSlot[],
    options: ExportOptions
  ): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: ${options.orientation === 'landscape' ? '1200px' : '800px'};
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
    `;

    // Group entries by day and time slot
    const entryGrid: Record<DayOfWeek, Record<string, TimetableEntry[]>> = {
      monday: {},
      tuesday: {},
      wednesday: {},
      thursday: {},
      friday: {},
      saturday: {}
    };

    entries.forEach(entry => {
      if (!entryGrid[entry.day][entry.time_slot_id]) {
        entryGrid[entry.day][entry.time_slot_id] = [];
      }
      entryGrid[entry.day][entry.time_slot_id].push(entry);
    });

    // Sort time slots
    const sortedTimeSlots = timeSlots
      .filter(slot => !slot.is_break)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Create title
    if (options.title) {
      const title = document.createElement('h1');
      title.textContent = options.title;
      title.style.cssText = `
        text-align: center;
        margin-bottom: 20px;
        font-size: 24px;
        font-weight: bold;
        color: #1f2937;
      `;
      container.appendChild(title);
    }

    // Create table
    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    // Create header
    const headerRow = document.createElement('tr');
    const timeHeader = document.createElement('th');
    timeHeader.textContent = 'Time';
    timeHeader.style.cssText = this.getHeaderCellStyle();
    headerRow.appendChild(timeHeader);

    days.forEach(day => {
      const dayHeader = document.createElement('th');
      dayHeader.textContent = day.charAt(0).toUpperCase() + day.slice(1);
      dayHeader.style.cssText = this.getHeaderCellStyle();
      headerRow.appendChild(dayHeader);
    });

    table.appendChild(headerRow);

    // Create time slot rows
    sortedTimeSlots.forEach(timeSlot => {
      const row = document.createElement('tr');
      
      // Time cell
      const timeCell = document.createElement('td');
      timeCell.innerHTML = `
        <div style="font-weight: bold;">${timeSlot.start_time}</div>
        <div style="color: #6b7280; font-size: 10px;">${timeSlot.end_time}</div>
      `;
      timeCell.style.cssText = this.getTimeCellStyle();
      row.appendChild(timeCell);

      // Day cells
      days.forEach(day => {
        const dayCell = document.createElement('td');
        const dayEntries = entryGrid[day][timeSlot.id] || [];
        
        if (dayEntries.length > 0) {
          const entriesContainer = document.createElement('div');
          entriesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
          
          dayEntries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.style.cssText = this.getEntryCellStyle(entry);
            
            let entryContent = `
              <div style="font-weight: bold; margin-bottom: 2px;">
                ${entry.subject?.code || entry.subject?.name || 'Unknown Subject'}
                ${entry.is_lab ? '<span style="background: #a855f7; color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-left: 4px;">LAB</span>' : ''}
              </div>
            `;

            if (options.include_teacher_details) {
              entryContent += `<div style="font-size: 10px; color: #4b5563; margin-bottom: 1px;">👤 ${entry.teacher?.name || 'Unknown Teacher'}</div>`;
            }

            if (options.include_room_details) {
              entryContent += `<div style="font-size: 10px; color: #4b5563;">📍 ${entry.classroom?.name || 'Unknown Room'}</div>`;
            }

            entryDiv.innerHTML = entryContent;
            entriesContainer.appendChild(entryDiv);
          });
          
          dayCell.appendChild(entriesContainer);
        }
        
        dayCell.style.cssText = this.getDayCellStyle();
        row.appendChild(dayCell);
      });

      table.appendChild(row);
    });

    container.appendChild(table);

    // Add generation timestamp
    const timestamp = document.createElement('div');
    timestamp.textContent = `Generated on ${new Date().toLocaleString()}`;
    timestamp.style.cssText = `
      text-align: center;
      color: #6b7280;
      font-size: 10px;
      margin-top: 10px;
    `;
    container.appendChild(timestamp);

    return container;
  }

  private static getHeaderCellStyle(): string {
    return `
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 10px 8px;
      text-align: center;
      font-weight: bold;
      color: #374151;
    `;
  }

  private static getTimeCellStyle(): string {
    return `
      background: #f9fafb;
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: center;
      width: 80px;
      vertical-align: middle;
    `;
  }

  private static getDayCellStyle(): string {
    return `
      border: 1px solid #d1d5db;
      padding: 4px;
      vertical-align: top;
      min-height: 60px;
      width: 140px;
    `;
  }

  private static getEntryCellStyle(entry: TimetableEntry): string {
    let backgroundColor = '#f3f4f6';
    let borderColor = '#d1d5db';
    let textColor = '#1f2937';

    if (entry.is_lab) {
      backgroundColor = '#faf5ff';
      borderColor = '#c084fc';
      textColor = '#7c3aed';
    } else {
      // Color based on department
      const colorMap: Record<string, { bg: string; border: string; text: string }> = {
        'Computer Science': { bg: '#eff6ff', border: '#60a5fa', text: '#1d4ed8' },
        'Mathematics': { bg: '#f0fdf4', border: '#4ade80', text: '#166534' },
        'Physics': { bg: '#fffbeb', border: '#fbbf24', text: '#92400e' },
        'Chemistry': { bg: '#fef2f2', border: '#f87171', text: '#991b1b' },
        'English': { bg: '#eef2ff', border: '#818cf8', text: '#3730a3' },
      };

      const colors = colorMap[entry.subject?.department || ''];
      if (colors) {
        backgroundColor = colors.bg;
        borderColor = colors.border;
        textColor = colors.text;
      }
    }

    return `
      background: ${backgroundColor};
      border: 1px solid ${borderColor};
      border-radius: 4px;
      padding: 6px;
      margin: 1px 0;
      color: ${textColor};
      font-size: 11px;
      line-height: 1.3;
    `;
  }

  /**
   * Download file with given blob and filename
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename for export
   */
  static generateFilename(
    format: 'pdf' | 'png',
    department?: string,
    semester?: number,
    academicYear?: string
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = 'timetable';

    if (department) {
      filename += `_${department.replace(/\s+/g, '_')}`;
    }

    if (semester) {
      filename += `_sem${semester}`;
    }

    if (academicYear) {
      filename += `_${academicYear.replace(/\s+/g, '_')}`;
    }

    filename += `_${timestamp}.${format}`;

    return filename;
  }
}