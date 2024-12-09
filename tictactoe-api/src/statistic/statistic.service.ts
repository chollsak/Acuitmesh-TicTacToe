import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Statistic, StatisticDocument } from './schemas/statistic.schema';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { UpdateStatisticDto } from './dto/update-statistic.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class StatisticService {
  constructor(
    @InjectModel(Statistic.name)
    private readonly statisticModel: Model<StatisticDocument>,
    private readonly userService: UserService
  ) {}

  async ensureStatistics(userId: string): Promise<Statistic> {
    let statistic = await this.statisticModel.findOne({ user: userId }).exec();

    if (!statistic) {
      statistic = new this.statisticModel({
        user: userId,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
      });
      return statistic.save();
    }

    return statistic;
  }

  async createStatistic(
    createStatisticDto: CreateStatisticDto,
  ): Promise<Statistic> {
    const { user, gamesPlayed = 0, gamesWon = 0, gamesLost = 0, gamesDraw = 0 } =
      createStatisticDto;

    const existingStatistic = await this.statisticModel.findOne({ user }).exec();
    if (existingStatistic) {
      throw new BadRequestException(
        'Statistic record already exists for this user',
      );
    }

    const statistic = new this.statisticModel({
      user,
      gamesPlayed,
      gamesWon,
      gamesLost,
      gamesDraw,
    });

    return statistic.save();
  }

async findAll(username: string) {
    const user = await this.userService.findIdByUsername(username);

    // Normalize the `user._id` to an `ObjectId` if possible
    const userId = user._id;
    const isObjectId = Types.ObjectId.isValid(userId);

    console.log('User ID:', userId, 'Type:', isObjectId ? 'ObjectId' : 'String');

    const query = {
        $or: [
            { user: isObjectId ? new Types.ObjectId(userId) : userId },
            { user: userId.toString() }
        ],
    };

    return this.statisticModel.find(query).exec();
}

  async updateStatistics(
    userId: string,
    updateData: Partial<UpdateStatisticDto>,
  ): Promise<Statistic> {
    const statistic = await this.statisticModel
      .findOneAndUpdate({ user: userId }, updateData, { new: true })
      .exec();

    if (!statistic) {
      throw new NotFoundException('Statistic record not found');
    }

    return statistic;
  }

  async incrementStat(userId: string, field: keyof Statistic): Promise<void> {
    const allowedFields = ['gamesPlayed', 'gamesWon', 'gamesLost', 'gamesDraw'];
  
    if (!allowedFields.includes(field)) {
      throw new BadRequestException('Invalid statistic field');
    }
  
    let statistic = await this.statisticModel.findOne({ user: userId }).exec();
  
    if (!statistic) {
      statistic = new this.statisticModel({
        user: userId,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDraw: 0,
      });
    }
  
    (statistic as StatisticDocument)[field]++;
    await (statistic as StatisticDocument).save();
  }
  
  async resetStatistics(userId: string): Promise<Statistic> {
    const statistic = await this.statisticModel
      .findOneAndUpdate(
        { user: userId },
        { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, gamesDraw: 0 },
        { new: true },
      )
      .exec();

    if (!statistic) {
      throw new NotFoundException('Statistic record not found');
    }

    return statistic;
  }
}
