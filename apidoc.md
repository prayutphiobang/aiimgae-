
API documentation
manage API key
GEN API
HTTP
POST
https://api.mojen.ai/api/v1/gen/feature_3FcCteXnsjxeCxxIL3LIUn2m99D
Authentication
HTTP Request Header
"Mojen-Api-Key": <your api key here>
Parameters
seed
224943707882501
KEY
"seed"
TYPE
number (int)
MIN
1000000
MAX
999999999999999
positive prompt

KEY
"text_0"
TYPE
string[]
MAX LEN
3000
body
Image URL
Enter image URL
KEY
"img_ref_0"
TYPE
string (url)
Example Payload (JSON)
{
  "params": {
    "seed": 224943707882501,
    "text_0": [],
    "img_ref_0": null
  }
}
CHECK TASK API
HTTP
GET
https://api.mojen.ai/api/v1/task/<your task uid here>
Authentication
HTTP Request Header
"Mojen-Api-Key": <your api key here>
Result Items
KEY
"result_url"
FORMAT
url
CONTENT TYPE
image/png
Example Response (JSON)
{
  "uid": "gen_3Bq2AJhLg5O5nPChlEbLAzhrM9k",
  "created_date": "2026-01-01T00:05:00Z",
  "status": "success",
  "feature_uid": "feature_3FcCteXnsjxeCxxIL3LIUn2m99D",
  "params": {
    "seed": 224943707882501,
    "text_0": [],
    "img_ref_0": null
  },
  "results": {
    "result_url": "https://cdn.mojen.ai/url_to_file"
  },
  "errors": [
    "if there are errors, they will be shown here"
  ],
  "api_key_id": "o4qzwfmgag95va11"
}