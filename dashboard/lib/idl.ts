export const IDL = {
  "address": "6TtRYmSVrymxprrKN1X6QJVho7qMqs1ayzucByNa7dXp",
  "metadata": {
    "name": "sol_signal",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "consume_signal",
      "docs": [
        "Consume a signal (requires active subscription)"
      ],
      "discriminator": [
        128,
        172,
        253,
        35,
        34,
        127,
        49,
        54
      ],
      "accounts": [
        {
          "name": "consumption_log",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  115,
                  117,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "subscriber"
              },
              {
                "kind": "account",
                "path": "signal"
              }
            ]
          }
        },
        {
          "name": "subscription",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "subscriber"
              },
              {
                "kind": "account",
                "path": "signal.agent",
                "account": "Signal"
              }
            ]
          }
        },
        {
          "name": "signal"
        },
        {
          "name": "subscriber",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "signal_index",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize the global registry (called once by deployer)"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "publish_signal",
      "docs": [
        "Publish a new trading signal"
      ],
      "discriminator": [
        169,
        80,
        49,
        93,
        169,
        216,
        95,
        190
      ],
      "accounts": [
        {
          "name": "signal",
          "writable": true
        },
        {
          "name": "agent_profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "asset",
          "type": "string"
        },
        {
          "name": "direction",
          "type": {
            "defined": {
              "name": "Direction"
            }
          }
        },
        {
          "name": "confidence",
          "type": "u8"
        },
        {
          "name": "entry_price",
          "type": "u64"
        },
        {
          "name": "target_price",
          "type": "u64"
        },
        {
          "name": "stop_loss",
          "type": "u64"
        },
        {
          "name": "time_horizon",
          "type": "i64"
        },
        {
          "name": "reasoning",
          "type": "string"
        }
      ]
    },
    {
      "name": "register_agent",
      "docs": [
        "Register a new agent profile"
      ],
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "agent_profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "resolve_signal",
      "docs": [
        "Resolve a signal after its time horizon has passed"
      ],
      "discriminator": [
        96,
        45,
        125,
        49,
        46,
        46,
        76,
        14
      ],
      "accounts": [
        {
          "name": "signal",
          "writable": true
        },
        {
          "name": "agent_profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent_profile.authority",
                "account": "AgentProfile"
              }
            ]
          }
        },
        {
          "name": "resolver",
          "docs": [
            "Anyone can resolve (permissionless resolution)"
          ],
          "signer": true
        }
      ],
      "args": [
        {
          "name": "resolution_price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "subscribe",
      "docs": [
        "Subscribe to an agent's signals by paying a fee"
      ],
      "discriminator": [
        254,
        28,
        191,
        138,
        156,
        179,
        183,
        53
      ],
      "accounts": [
        {
          "name": "subscription",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "subscriber"
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "subscriber",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fee_lamports",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "AgentProfile",
      "discriminator": [
        60,
        227,
        42,
        24,
        0,
        87,
        86,
        205
      ]
    },
    {
      "name": "ConsumptionLog",
      "discriminator": [
        40,
        80,
        207,
        202,
        162,
        71,
        26,
        164
      ]
    },
    {
      "name": "Registry",
      "discriminator": [
        47,
        174,
        110,
        246,
        184,
        182,
        252,
        218
      ]
    },
    {
      "name": "Signal",
      "discriminator": [
        20,
        6,
        227,
        69,
        183,
        62,
        78,
        246
      ]
    },
    {
      "name": "Subscription",
      "discriminator": [
        64,
        7,
        26,
        135,
        102,
        132,
        98,
        33
      ]
    }
  ],
  "events": [
    {
      "name": "SignalConsumed",
      "discriminator": [
        117,
        10,
        29,
        131,
        71,
        74,
        241,
        190
      ]
    },
    {
      "name": "SignalPublished",
      "discriminator": [
        27,
        49,
        10,
        82,
        168,
        186,
        203,
        42
      ]
    },
    {
      "name": "SignalResolved",
      "discriminator": [
        6,
        23,
        99,
        122,
        213,
        120,
        140,
        49
      ]
    },
    {
      "name": "SubscriptionCreated",
      "discriminator": [
        215,
        63,
        169,
        25,
        179,
        200,
        180,
        105
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NameTooLong",
      "msg": "Agent name too long (max 32 chars)"
    },
    {
      "code": 6001,
      "name": "AssetTooLong",
      "msg": "Asset symbol too long (max 32 chars)"
    },
    {
      "code": 6002,
      "name": "InvalidConfidence",
      "msg": "Confidence must be 0-100"
    },
    {
      "code": 6003,
      "name": "ReasoningTooLong",
      "msg": "Reasoning text too long (max 512 chars)"
    },
    {
      "code": 6004,
      "name": "InvalidTimeHorizon",
      "msg": "Time horizon must be in the future"
    },
    {
      "code": 6005,
      "name": "AlreadyResolved",
      "msg": "Signal already resolved"
    },
    {
      "code": 6006,
      "name": "TimeHorizonNotReached",
      "msg": "Time horizon not yet reached"
    },
    {
      "code": 6007,
      "name": "Unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6008,
      "name": "InvalidFee",
      "msg": "Subscription fee must be greater than zero"
    },
    {
      "code": 6009,
      "name": "SubscriptionInactive",
      "msg": "Subscription is not active"
    },
    {
      "code": 6010,
      "name": "SubscriptionExpired",
      "msg": "Subscription has expired"
    }
  ],
  "types": [
    {
      "name": "AgentProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "total_signals",
            "type": "u32"
          },
          {
            "name": "correct_signals",
            "type": "u32"
          },
          {
            "name": "incorrect_signals",
            "type": "u32"
          },
          {
            "name": "expired_signals",
            "type": "u32"
          },
          {
            "name": "accuracy_bps",
            "type": "u16"
          },
          {
            "name": "reputation_score",
            "type": "u64"
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "ConsumptionLog",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriber",
            "type": "pubkey"
          },
          {
            "name": "signal",
            "type": "pubkey"
          },
          {
            "name": "consumed_at",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Direction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Long"
          },
          {
            "name": "Short"
          }
        ]
      }
    },
    {
      "name": "Outcome",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Pending"
          },
          {
            "name": "Correct"
          },
          {
            "name": "Incorrect"
          },
          {
            "name": "Expired"
          }
        ]
      }
    },
    {
      "name": "Registry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "total_signals",
            "type": "u64"
          },
          {
            "name": "total_agents",
            "type": "u64"
          },
          {
            "name": "signal_fee",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Signal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "asset",
            "type": "string"
          },
          {
            "name": "direction",
            "type": {
              "defined": {
                "name": "Direction"
              }
            }
          },
          {
            "name": "confidence",
            "type": "u8"
          },
          {
            "name": "entry_price",
            "type": "u64"
          },
          {
            "name": "target_price",
            "type": "u64"
          },
          {
            "name": "stop_loss",
            "type": "u64"
          },
          {
            "name": "time_horizon",
            "type": "i64"
          },
          {
            "name": "reasoning_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "created_at",
            "type": "i64"
          },
          {
            "name": "resolved",
            "type": "bool"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          },
          {
            "name": "resolution_price",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "SignalConsumed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriber",
            "type": "pubkey"
          },
          {
            "name": "signal",
            "type": "pubkey"
          },
          {
            "name": "signal_index",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "SignalPublished",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "signal",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "type": "string"
          },
          {
            "name": "direction",
            "type": {
              "defined": {
                "name": "Direction"
              }
            }
          },
          {
            "name": "confidence",
            "type": "u8"
          },
          {
            "name": "entry_price",
            "type": "u64"
          },
          {
            "name": "target_price",
            "type": "u64"
          },
          {
            "name": "time_horizon",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "SignalResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "signal",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          },
          {
            "name": "resolution_price",
            "type": "u64"
          },
          {
            "name": "accuracy_bps",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "Subscription",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriber",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "fee_paid",
            "type": "u64"
          },
          {
            "name": "subscribed_at",
            "type": "i64"
          },
          {
            "name": "expires_at",
            "type": "i64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "SubscriptionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subscriber",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "fee_paid",
            "type": "u64"
          },
          {
            "name": "expires_at",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
