import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'Request failed' })
  message!: string;

  @ApiProperty({ example: ['Validation error detail'], type: [String] })
  errors!: string[];
}
