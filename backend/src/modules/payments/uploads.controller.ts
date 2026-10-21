import {
  Controller, Post, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { paymentProofMulterOptions, UPLOAD_URL_PREFIX } from './upload.config';

@ApiTags('Uploads')
@ApiBearerAuth('JWT-auth')
@Controller('uploads')
export class UploadsController {
  @Post('payment-proof')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importer une image de preuve de paiement (JPG/PNG/WEBP/PDF, 5 Mo max)' })
  @UseInterceptors(FileInterceptor('file', paymentProofMulterOptions))
  upload(@UploadedFile() file?: { filename: string }) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return { url: `${UPLOAD_URL_PREFIX}/${file.filename}` };
  }
}
