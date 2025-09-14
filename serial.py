import hashlib
import sys

BS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
SALT = "54l71554l7y"


def to_base(s, b):
    res = ""
    while s:
        res += BS[s % b]
        s //= b
    return res[::-1] or "0"


def to_hash(i):
    x = "{}{}".format(SALT, i)
    return hashlib.sha256(x.encode("utf-8")).digest()


def get_serial(s, length=6):
    hash = to_hash(s)
    hashint = int.from_bytes(hash[0:31], "big")
    converted = to_base(hashint, 32)
    token = converted.ljust(8, BS[0])
    return str(token)[0:length]
