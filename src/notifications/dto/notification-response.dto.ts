import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  data!: Record<string, string>;

  @ApiProperty()
  read!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
