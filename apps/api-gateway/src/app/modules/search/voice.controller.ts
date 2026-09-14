/// <reference types="multer" />
import {
  BadGatewayException, BadRequestException, Controller, Post,
  ServiceUnavailableException, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import Groq, { toFile } from 'groq-sdk';

@ApiTags('Search')
@Controller('search')
export class VoiceController {
  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe a short Vietnamese voice search' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
    fileFilter: (_req, file, callback) => {
      const allowed = /^(audio\/(webm|mp4|mpeg|ogg|wav|x-wav)|video\/webm)$/;
      callback(allowed.test(file.mimetype) ? null : new BadRequestException('Unsupported audio format'), allowed.test(file.mimetype));
    },
  }))
  async transcribe(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.size) throw new BadRequestException('An audio recording is required');
    const apiKey = process.env['GROQ_API_KEY'];
    if (!apiKey) throw new ServiceUnavailableException('Voice search is unavailable');
    try {
      const client = new Groq({ apiKey, timeout: 20_000, maxRetries: 0 });
      const result = await client.audio.transcriptions.create({
        file: await toFile(file.buffer, file.originalname, { type: file.mimetype }),
        model: 'whisper-large-v3',
        language: 'vi',
      });
      return { text: result.text };
    } catch {
      throw new BadGatewayException('Voice search is temporarily unavailable');
    }
  }
}
