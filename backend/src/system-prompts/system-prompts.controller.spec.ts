import { Test, TestingModule } from '@nestjs/testing';
import { SystemPromptsController } from './system-prompts.controller';
import { SystemPromptsService } from './system-prompts.service';

describe('SystemPromptsController', () => {
  let controller: SystemPromptsController;
  let service: SystemPromptsService;

  const mockPrompt = {
    id: '1',
    name: 'Main AI',
    content: 'You are a helpful assistant.',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    create: jest.fn().mockResolvedValue(mockPrompt),
    findAll: jest.fn().mockResolvedValue({
      data: [mockPrompt],
      meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
    }),
    findOne: jest.fn().mockResolvedValue(mockPrompt),
    update: jest.fn().mockResolvedValue({ ...mockPrompt, name: 'Updated' }),
    remove: jest.fn().mockResolvedValue(mockPrompt),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemPromptsController],
      providers: [
        {
          provide: SystemPromptsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SystemPromptsController>(SystemPromptsController);
    service = module.get<SystemPromptsService>(SystemPromptsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a system prompt', async () => {
      const dto = { name: 'Main AI', content: 'You are a helpful assistant.' };
      const result = await controller.create(dto);
      expect(result).toEqual(mockPrompt);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return a list', async () => {
      const result = await controller.findAll({ page: 1, perPage: 10 });
      expect(result).toEqual({
        data: [mockPrompt],
        meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
      });
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, perPage: 10 });
    });
  });

  describe('findOne', () => {
    it('should return a single prompt', async () => {
      const result = await controller.findOne('1');
      expect(result).toEqual(mockPrompt);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update a prompt', async () => {
      const dto = { name: 'Updated' };
      const result = await controller.update('1', dto);
      expect(result).toEqual({ ...mockPrompt, name: 'Updated' });
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('remove', () => {
    it('should remove a prompt', async () => {
      const result = await controller.remove('1');
      expect(result).toEqual(mockPrompt);
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
