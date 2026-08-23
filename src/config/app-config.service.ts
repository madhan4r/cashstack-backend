import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppConfig,
  DatabaseConfig,
  FirebaseConfig,
  JwtConfig,
} from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get app(): AppConfig {
    return this.configService.getOrThrow<AppConfig>('app');
  }

  get database(): DatabaseConfig {
    return this.configService.getOrThrow<DatabaseConfig>('database');
  }

  get jwt(): JwtConfig {
    return this.configService.getOrThrow<JwtConfig>('jwt');
  }

  get firebase(): FirebaseConfig {
    return this.configService.getOrThrow<FirebaseConfig>('firebase');
  }

  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }
}
