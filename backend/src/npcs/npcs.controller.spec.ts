import { Test, TestingModule } from '@nestjs/testing';
import { NpcsController } from './npcs.controller';
import { NpcsService } from './npcs.service';

describe('NpcsController', () => {
  let controller: NpcsController;
  let service: NpcsService;

  const mockNpc = {
    id: 'u-u-i-d',
    name: 'Guard',
    spawnX: 10,
    spawnY: 0,
    spawnZ: -10,
    characterPrompt: 'You guard the gate.',
    createdAt: new Date(),
    updatedAt: new Date(),
    tools: [],
  };

  const mockService = {
    create: jest.fn().mockResolvedValue(mockNpc),
    findAll: jest.fn().mockResolvedValue({
      data: [mockNpc],
      meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
    }),
    findOne: jest.fn().mockResolvedValue(mockNpc),
    update: jest.fn().mockResolvedValue({ ...mockNpc, name: 'Elite Guard' }),
    remove: jest.fn().mockResolvedValue(mockNpc),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NpcsController],
      providers: [
        {
          provide: NpcsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NpcsController>(NpcsController);
    service = module.get<NpcsService>(NpcsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an NPC', async () => {
      const dto = {
        name: 'Guard',
        spawnX: 10,
        spawnY: 0,
        spawnZ: -10,
        characterPrompt: 'You guard the gate.',
      };
      const result = await controller.create(dto);
      expect(result).toEqual(mockNpc);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return a list', async () => {
      const result = await controller.findAll({ page: 1, perPage: 10 });
      expect(result).toEqual({
        data: [mockNpc],
        meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
      });
      expect(service.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a single NPC', async () => {
      const result = await controller.findOne('u-u-i-d');
      expect(result).toEqual(mockNpc);
      expect(service.findOne).toHaveBeenCalledWith('u-u-i-d');
    });
  });

  describe('update', () => {
    it('should update an NPC', async () => {
      const dto = { name: 'Elite Guard' };
      const result = await controller.update('u-u-i-d', dto);
      expect(result).toEqual({ ...mockNpc, name: 'Elite Guard' });
      expect(service.update).toHaveBeenCalledWith('u-u-i-d', dto);
    });
  });

  describe('remove', () => {
    it('should remove an NPC', async () => {
      const result = await controller.remove('u-u-i-d');
      expect(result).toEqual(mockNpc);
      expect(service.remove).toHaveBeenCalledWith('u-u-i-d');
    });
  });
});
