import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Review, ReviewReport, VenueReport } from "@mynook/database";
import { ReviewReportController } from "./review-report.controller.js";
import { ReviewReportService } from "./review-report.service.js";
import { VenueReportController } from "./venue-report.controller.js";
import { VenueReportService } from "./venue-report.service.js";

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewReport, VenueReport])],
  controllers: [ReviewReportController, VenueReportController],
  providers: [ReviewReportService, VenueReportService],
  exports: [ReviewReportService, VenueReportService],
})
export class ReportModule {}
