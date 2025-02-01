from pydantic import BaseModel, Field
from typing import Optional

class CelloOptions(BaseModel):
    verbose: bool
    log_overwrite: bool
    print_iters: bool
    exhaustive: bool
    test_configs: bool

class CelloRequest(BaseModel):
    verilog_file: Optional[str] = None
    verilogCode: Optional[str] = Field(
        None, description="Código Verilog directamente proporcionado en la solicitud."
    )
    ucfIndex: Optional[int] = None
    customUcf: Optional[str] = None
    customInput: Optional[str] = None
    customOutput: Optional[str] = None
    options: CelloOptions

    class Config:
        schema_extra = {
            "example": {
                "verilogFile": "and",
                "verilogCode": "module and_gate(...); ... endmodule",
                "ucfIndex": 1,
                "options": {
                    "verbose": True,
                    "log_overwrite": False,
                    "print_iters": False,
                    "exhaustive": False,
                    "test_configs": False
                }
            }
        }
