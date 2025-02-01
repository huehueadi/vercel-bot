// import Chat from '../models/chatModel.js';

// const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 minutes

// export const cleanupInactiveSessions = async () => {
//   try {
//     const expirationTime = new Date(Date.now() - SESSION_TIMEOUT);
    
//     // Find and delete sessions inactive for 3 minutes
//     const result = await Chat.deleteMany({ last_activity: { $lt: expirationTime } });

//     console.log(`Deleted ${result.deletedCount} inactive sessions.`);
//   } catch (error) {
//     console.error("Error cleaning up inactive sessions:", error.message);
//   }
// };
