import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OfertaExpirationService {
  private readonly logger = new Logger(OfertaExpirationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expirarOfertasVencidas() {
    const ahora = new Date();

    const { count } = await this.prisma.oferta.updateMany({
      where: {
        fecha_fin: { lt: ahora },
        estado: 'ACTIVA',
      },
      data: { estado: 'EXPIRADA' },
    });

    if (count > 0) {
      this.logger.log(`${count} oferta(s) expirada(s) automáticamente`);
    }
  }
}
