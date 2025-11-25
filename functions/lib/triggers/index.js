"use strict";
/**
 * 🎯 Quiz RAG Index Triggers
 *
 * Event-Driven Architecture for automatic RAG index updates
 *
 * These triggers automatically maintain the RAG vector index in sync with the quiz database:
 *
 * 1. onQuizApproved - When admin approves a quiz (pending -> approved)
 *    → Generates embeddings and adds quiz to RAG index
 *
 * 2. onQuizCreatedApproved - When a quiz is created with approved status directly
 *    → Generates embeddings and adds quiz to RAG index
 *
 * 3. onQuizApproved (content update) - When approved quiz content changes
 *    → Re-generates embeddings and updates quiz in RAG index
 *
 * 4. onQuizDeleted - When a quiz is deleted
 *    → Removes quiz chunks from RAG index
 *
 * Benefits:
 * - No manual "Build Index" needed
 * - Incremental updates (only changed quiz, not full rebuild)
 * - Real-time sync with quiz database
 * - Efficient: Only embeds approved quizzes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onQuizDeleted = exports.onQuizCreatedApproved = exports.onQuizApproved = void 0;
// Quiz approval triggers (handles create, update, status changes)
var onQuizApproved_1 = require("./onQuizApproved");
Object.defineProperty(exports, "onQuizApproved", { enumerable: true, get: function () { return onQuizApproved_1.onQuizApproved; } });
Object.defineProperty(exports, "onQuizCreatedApproved", { enumerable: true, get: function () { return onQuizApproved_1.onQuizCreatedApproved; } });
// Quiz deletion trigger
var onQuizDeleted_1 = require("./onQuizDeleted");
Object.defineProperty(exports, "onQuizDeleted", { enumerable: true, get: function () { return onQuizDeleted_1.onQuizDeleted; } });
//# sourceMappingURL=index.js.map