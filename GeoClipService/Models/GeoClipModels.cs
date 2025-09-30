using Newtonsoft.Json;

namespace GeoClipService.Models
{
    public class AddressEmbedding
    {
        [JsonProperty("input_ids")]
        public long[] InputIds { get; set; }

        [JsonProperty("attention_mask")]
        public float[] AttentionMask { get; set; }
    }

    public class Coordinate
    {
        [JsonProperty("lat")]
        public double Lat { get; set; }

        [JsonProperty("lon")]
        public double Lon { get; set; }
    }
}
