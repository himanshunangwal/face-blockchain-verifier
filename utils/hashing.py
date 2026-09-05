import hashlib
import json


def generate_hash(data):
    data_string = json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":")
    ).encode("utf-8")

    return hashlib.sha256(data_string).hexdigest()