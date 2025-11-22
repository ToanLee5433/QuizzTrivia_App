/**
 * Modern Multiplayer Error Classes
 * 
 * Provides typed error handling with i18n support and proper error codes
 * for better debugging and user experience.
 */

export class MultiplayerError extends Error {
  constructor(
    public code: string,
    public i18nKey: string,
    public statusCode: number,
    message?: string
  ) {
    super(message);
    this.name = 'MultiplayerError';
  }
}

export class AuthenticationError extends MultiplayerError {
  constructor() {
    super('AUTH_REQUIRED', 'errors.authRequired', 401, 'User not authenticated');
  }
}

export class RoomNotFoundError extends MultiplayerError {
  constructor(roomCode: string) {
    super('ROOM_NOT_FOUND', 'errors.roomNotFound', 404, `Room ${roomCode} not found`);
  }
}

export class RoomFullError extends MultiplayerError {
  constructor() {
    super('ROOM_FULL', 'errors.roomFull', 403, 'Room is full');
  }
}

export class GameInProgressError extends MultiplayerError {
  constructor() {
    super('GAME_IN_PROGRESS', 'errors.gameInProgress', 403, 'Game already in progress');
  }
}

export class PasswordError extends MultiplayerError {
  constructor() {
    super('INVALID_PASSWORD', 'errors.invalidPassword', 401, 'Invalid password');
  }
}

export class ValidationError extends MultiplayerError {
  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', `errors.validation.${field}`, 400, message);
  }
}

export class UnauthorizedError extends MultiplayerError {
  constructor(action: string) {
    super('UNAUTHORIZED', 'errors.unauthorized', 403, `Not authorized to ${action}`);
  }
}

export class RateLimitError extends MultiplayerError {
  constructor(action: string, retryAfterSeconds?: number) {
    super('RATE_LIMITED', 'errors.rateLimited', 429, `Too many requests for ${action}${retryAfterSeconds ? ` (retry in ${retryAfterSeconds}s)` : ''}`);
  }
}

export class TimeoutError extends MultiplayerError {
  constructor(operation: string) {
    super('TIMEOUT', 'errors.timeout', 408, `Operation ${operation} timed out`);
  }
}

export class NetworkError extends MultiplayerError {
  constructor(message: string = 'Network connection failed') {
    super('NETWORK_ERROR', 'errors.network', 503, message);
  }
}

export class QuestionNotFoundError extends MultiplayerError {
  constructor(questionId: string) {
    super('QUESTION_NOT_FOUND', 'errors.questionNotFound', 404, `Question ${questionId} not found`);
  }
}

export class RoomCodeGenerationError extends MultiplayerError {
  constructor() {
    super('CODE_GENERATION_FAILED', 'errors.codeGenerationFailed', 500, 'Failed to generate unique room code');
  }
}

export class PlayerNotFoundError extends MultiplayerError {
  constructor(playerId: string) {
    super('PLAYER_NOT_FOUND', 'errors.playerNotFound', 404, `Player ${playerId} not found`);
  }
}

export class HostTransferError extends MultiplayerError {
  constructor(reason: string) {
    super('HOST_TRANSFER_FAILED', 'errors.hostTransferFailed', 500, `Failed to transfer host: ${reason}`);
  }
}
