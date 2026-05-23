import os

AWS_REGION     = os.getenv("AWS_DEFAULT_REGION", "ap-southeast-2")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE", "care360-alerts")
IOT_THING_NAME = os.getenv("IOT_THING_NAME", "gw4_hz_01")
LOCAL_CONFIG   = os.path.join(os.path.dirname(__file__), "local_config.json")
