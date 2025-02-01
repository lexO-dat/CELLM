 module top (input A, input B, input C, output Y);
    wire D;
    assign D = A & B;
    assign Y = D ^ C;
  endmodule