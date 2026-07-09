namespace ECommerce.Application.Common.Exceptions;

// Базовый класс для 404
public class NotFoundException(string message) : Exception(message);

// Базовый класс для 409 (Конфликт данных)
public class ConflictException(string message) : Exception(message);

// Базовый класс для 400 (Плохой запрос / Ошибка валидации)
public class BadRequestException(string message) : Exception(message);