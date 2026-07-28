namespace ECommerce.Application.Common.Exceptions;

// Базовый класс для 404
public class NotFoundException(string message) : Exception(message);

// Базовый класс для 409 (Конфликт данных)
public class ConflictException(string message) : Exception(message);

// Базовый класс для 400 (Плохой запрос / Ошибка валидации)
public class BadRequestException(string message) : Exception(message);

// Базовый класс для 401 (Не авторизован / неверные учётные данные)
public class UnauthorizedException(string message) : Exception(message);

// Базовый класс для 403 (Доступ запрещён)
public class ForbiddenException(string message) : Exception(message);

// Базовый класс для 503 (Зависимый сервис недоступен)
public class ServiceUnavailableException(string message) : Exception(message);