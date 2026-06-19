// src/auth/dto/auth.dto.ts
import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(10, 10, { message: 'کد ملی باید ۱۰ رقم باشد' })
  @Matches(/^\d{10}$/, { message: 'کد ملی فقط عدد' })
  nationalCode: string;

  @IsString()
  @Length(6, 100, { message: 'رمز عبور حداقل ۶ کاراکتر' })
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}
