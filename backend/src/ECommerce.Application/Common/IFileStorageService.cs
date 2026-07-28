namespace ECommerce.Application.Common;

public interface IFileStorageService
{
    /// <summary>
    /// Загружает файл в хранилище и возвращает публичный URL, по которому он доступен.
    /// </summary>
    Task<string> UploadAsync(
        Stream content,
        string objectName,
        string contentType,
        CancellationToken cancellationToken);

    /// <summary>Удаляет файл по URL, ранее возвращённому UploadAsync. Не бросает, если файла уже нет.</summary>
    Task DeleteAsync(string fileUrl, CancellationToken cancellationToken);
}
