import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Plant, PlantDocument } from '../plants/schemas/plant.schema';
import { Shelf, ShelfDocument } from '../shelves/schemas/shelf.schema';
import { PlantHistory, PlantHistoryDocument } from '../plants/schemas/plant-history.schema';
import { Genus, GenusDocument } from '../genus/schemas/genus.schema';
import { Variety, VarietyDocument } from '../variety/schemas/variety.schema';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadsInfo {
  total: { files: number; sizeBytes: number; sizeMb: string };
  byFolder: { name: string; files: number; sizeBytes: number; sizeMb: string }[];
}

export interface StatsInfo {
  users: {
    total: number;
    today: number;
    last3days: number;
    lastWeek: number;
    lastMonth: number;
  };
  plants: {
    total: number;
    archived: number;
    today: number;
    last3days: number;
    lastWeek: number;
    lastMonth: number;
  };
  shelves: {
    total: number;
    today: number;
    last3days: number;
    lastWeek: number;
    lastMonth: number;
  };
  plantHistory: {
    total: number;
    today: number;
    last3days: number;
    lastWeek: number;
    lastMonth: number;
  };
  genus: { total: number };
  varieties: { total: number };
}

export interface AdminInfoResponse {
  uploads: UploadsInfo;
  stats: StatsInfo;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Plant.name) private plantModel: Model<PlantDocument>,
    @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>,
    @InjectModel(PlantHistory.name) private plantHistoryModel: Model<PlantHistoryDocument>,
    @InjectModel(Genus.name) private genusModel: Model<GenusDocument>,
    @InjectModel(Variety.name) private varietyModel: Model<VarietyDocument>,
  ) {}

  async getInfo(): Promise<AdminInfoResponse> {
    const uploads = this.getUploadsInfo();
    const stats = await this.getStatsInfo();
    return { uploads, stats };
  }

  private getUploadsInfo(): UploadsInfo {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const byFolder: { name: string; files: number; sizeBytes: number; sizeMb: string }[] = [];
    let totalFiles = 0;
    let totalBytes = 0;

    if (!fs.existsSync(uploadsDir)) {
      return {
        total: { files: 0, sizeBytes: 0, sizeMb: '0 MB' },
        byFolder: [],
      };
    }

    const folders = fs.readdirSync(uploadsDir, { withFileTypes: true });

    for (const folder of folders) {
      if (folder.isDirectory()) {
        const folderPath = path.join(uploadsDir, folder.name);
        const { files, bytes } = this.getSizeRecursive(folderPath);
        totalFiles += files;
        totalBytes += bytes;
        byFolder.push({
          name: folder.name,
          files,
          sizeBytes: bytes,
          sizeMb: this.formatBytes(bytes),
        });
      }
    }

    byFolder.sort((a, b) => b.sizeBytes - a.sizeBytes);

    return {
      total: {
        files: totalFiles,
        sizeBytes: totalBytes,
        sizeMb: this.formatBytes(totalBytes),
      },
      byFolder,
    };
  }

  private getSizeRecursive(dir: string): { files: number; bytes: number } {
    let files = 0;
    let bytes = 0;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sub = this.getSizeRecursive(fullPath);
          files += sub.files;
          bytes += sub.bytes;
        } else {
          files += 1;
          bytes += fs.statSync(fullPath).size;
        }
      }
    } catch (err) {
      // Directory might be inaccessible
    }

    return { files, bytes };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  private async getStatsInfo(): Promise<StatsInfo> {
    const now = new Date();
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const last3days = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersToday,
      usersLast3days,
      usersLastWeek,
      usersLastMonth,
      totalPlants,
      archivedPlants,
      plantsToday,
      plantsLast3days,
      plantsLastWeek,
      plantsLastMonth,
      totalShelves,
      shelvesToday,
      shelvesLast3days,
      shelvesLastWeek,
      shelvesLastMonth,
      totalHistory,
      historyToday,
      historyLast3days,
      historyLastWeek,
      historyLastMonth,
      totalGenus,
      totalVarieties,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ createdAt: { $gte: today } }),
      this.userModel.countDocuments({ createdAt: { $gte: last3days } }),
      this.userModel.countDocuments({ createdAt: { $gte: lastWeek } }),
      this.userModel.countDocuments({ createdAt: { $gte: lastMonth } }),
      this.plantModel.countDocuments(),
      this.plantModel.countDocuments({ isArchived: true }),
      this.plantModel.countDocuments({ createdAt: { $gte: today } }),
      this.plantModel.countDocuments({ createdAt: { $gte: last3days } }),
      this.plantModel.countDocuments({ createdAt: { $gte: lastWeek } }),
      this.plantModel.countDocuments({ createdAt: { $gte: lastMonth } }),
      this.shelfModel.countDocuments(),
      this.shelfModel.countDocuments({ createdAt: { $gte: today } }),
      this.shelfModel.countDocuments({ createdAt: { $gte: last3days } }),
      this.shelfModel.countDocuments({ createdAt: { $gte: lastWeek } }),
      this.shelfModel.countDocuments({ createdAt: { $gte: lastMonth } }),
      this.plantHistoryModel.countDocuments(),
      this.plantHistoryModel.countDocuments({ createdAt: { $gte: today } }),
      this.plantHistoryModel.countDocuments({ createdAt: { $gte: last3days } }),
      this.plantHistoryModel.countDocuments({ createdAt: { $gte: lastWeek } }),
      this.plantHistoryModel.countDocuments({ createdAt: { $gte: lastMonth } }),
      this.genusModel.countDocuments(),
      this.varietyModel.countDocuments(),
    ]);

    return {
      users: {
        total: totalUsers,
        today: usersToday,
        last3days: usersLast3days,
        lastWeek: usersLastWeek,
        lastMonth: usersLastMonth,
      },
      plants: {
        total: totalPlants,
        archived: archivedPlants,
        today: plantsToday,
        last3days: plantsLast3days,
        lastWeek: plantsLastWeek,
        lastMonth: plantsLastMonth,
      },
      shelves: {
        total: totalShelves,
        today: shelvesToday,
        last3days: shelvesLast3days,
        lastWeek: shelvesLastWeek,
        lastMonth: shelvesLastMonth,
      },
      plantHistory: {
        total: totalHistory,
        today: historyToday,
        last3days: historyLast3days,
        lastWeek: historyLastWeek,
        lastMonth: historyLastMonth,
      },
      genus: { total: totalGenus },
      varieties: { total: totalVarieties },
    };
  }
}
