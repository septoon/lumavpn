import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginDto, TelegramWebAppLoginDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('admin/login')
  login(@Body() dto: AdminLoginDto) {
    return this.auth.loginAdmin(dto.email, dto.password);
  }

  @Post('telegram/webapp')
  loginTelegramWebApp(@Body() dto: TelegramWebAppLoginDto) {
    return this.auth.loginTelegramWebApp(dto.initData);
  }
}
