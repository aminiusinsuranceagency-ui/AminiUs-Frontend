// import { Injectable } from '@angular/core';
// import { Message } from '../interfaces/Message'; // Adjust path as needed
// import { v4 as uuidv4 } from 'uuid';

// @Injectable({
//   providedIn: 'root'
// })
// export class MessagesService {

//   private messages: Message[] = [
//     {
//       messageId: uuidv4(),
//       clientId: 'c1',
//       type: 'Birthday',
//       title: 'Happy Birthday!',
//       content: 'Wishing you a fantastic birthday!',
//       dateScheduled: new Date(),
//       sent: false
//     },
//     {
//       messageId: uuidv4(),
//       clientId: 'c2',
//       type: 'Public Holiday',
//       title: 'Happy Madaraka Day!',
//       content: 'Enjoy your public holiday!',
//       dateScheduled: new Date(),
//       sent: true
//     }
//   ];

//   private today: Date = new Date();

//   constructor() {}

//   /**
//    * Get all messages
//    */
//   getAllMessages(): Message[] {
//     return this.messages;
//   }

//   /**
//    * Get all messages scheduled for today
//    */
//   getTodayMessages(): Message[] {
//     return this.messages.filter(m => this.isSameDay(m.dateScheduled, this.today));
//   }

//   /**
//    * Add a new message
//    */
//   addMessage(newMessage: Message): void {
//     newMessage.messageId = uuidv4();
//     newMessage.sent = false;
//     this.messages.push(newMessage);
//   }

//   /**
//    * Update an existing message
//    */
//   updateMessage(messageId: string, updatedData: Partial<Message>): boolean {
//     const index = this.messages.findIndex(m => m.messageId === messageId);
//     if (index > -1) {
//       this.messages[index] = { ...this.messages[index], ...updatedData };
//       return true;
//     }
//     return false;
//   }

//   /**
//    * Delete a message by ID
//    */
//   deleteMessage(messageId: string): boolean {
//     const index = this.messages.findIndex(m => m.messageId === messageId);
//     if (index > -1) {
//       this.messages.splice(index, 1);
//       return true;
//     }
//     return false;
//   }

//   /**
//    * Automatically send all unsent messages scheduled for today
//    */
//   autoSendTodayMessages(): void {
//     this.messages.forEach(msg => {
//       if (!msg.sent && this.isSameDay(msg.dateScheduled, this.today)) {
//         console.log(`Sending Message to client ${msg.clientId}: ${msg.title}`);
//         msg.sent = true;
//       }
//     });
//   }

//   /**
//    * Helper function to check if two dates fall on the same day
//    */
//   private isSameDay(date1: Date, date2: Date): boolean {
//     return (
//       new Date(date1).getDate() === date2.getDate() &&
//       new Date(date1).getMonth() === date2.getMonth() &&
//       new Date(date1).getFullYear() === date2.getFullYear()
//     );
//   }
// }
