import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}

export class RenameChatSessionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;
}

export class SendChatMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}
