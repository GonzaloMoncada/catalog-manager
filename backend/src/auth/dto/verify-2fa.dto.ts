import { IsString, IsNotEmpty } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  token_2fa: string;
}
