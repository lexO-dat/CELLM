module and_xor_gate(output out, input A, B, C);
      wire output1;
      assign output1 = A & B;
      assign out = output1 ^ C;
  endmodule