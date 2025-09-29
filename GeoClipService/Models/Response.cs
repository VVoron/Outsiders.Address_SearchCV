namespace GeoClipService.Models;

public class Response
{
    public IList<string>? Jobs { get; set; }
    public IList<ValidationErrorResponse>? ValidationErrors { get; set; }
}