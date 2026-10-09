import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;
}

export class GoogleDto {
  /** The ID token (JWT) returned by Google Identity Services. */
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  credential: string;
}
