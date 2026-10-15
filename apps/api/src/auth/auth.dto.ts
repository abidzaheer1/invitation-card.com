import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
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

export class TokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MaxLength(128)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @MaxLength(128)
  newPassword: string;
}

export class UpdateProfileDto {
  @IsString()
  @MaxLength(100)
  name: string;
}

export class DeleteAccountDto {
  /** Needed for accounts that have a password. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;

  /** A fresh Google ID token, needed for accounts that only use Google. */
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  credential?: string;
}
