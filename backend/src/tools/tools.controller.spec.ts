import { Test, TestingModule } from '@nestjs/testing';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

describe('ToolsController', () => {
  let controller: ToolsController;
  let service: ToolsService;

  const mockTool = {
    id: '1',
    name: 'Test Tool',
    description: 'A mock tool for testing',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockToolsService = {
    create: jest.fn().mockResolvedValue(mockTool),
    findAll: jest.fn().mockResolvedValue({
      data: [mockTool],
      meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
    }),
    findOne: jest.fn().mockResolvedValue(mockTool),
    update: jest.fn().mockResolvedValue({ ...mockTool, name: 'Updated Tool' }),
    remove: jest.fn().mockResolvedValue(mockTool),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToolsController],
      providers: [
        {
          provide: ToolsService,
          useValue: mockToolsService,
        },
      ],
    }).compile();

    controller = module.get<ToolsController>(ToolsController);
    service = module.get<ToolsService>(ToolsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tool', async () => {
      const dto = { name: 'Test Tool', description: 'A mock tool for testing' };
      const result = await controller.create(dto);
      expect(result).toEqual(mockTool);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return a list of tools', async () => {
      const result = await controller.findAll({ page: 1, perPage: 10 });
      expect(result).toEqual({
        data: [mockTool],
        meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
      });
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, perPage: 10 });
    });
  });

  describe('findOne', () => {
    it('should return a single tool', async () => {
      const result = await controller.findOne('1');
      expect(result).toEqual(mockTool);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update a tool', async () => {
      const dto = { name: 'Updated Tool' };
      const result = await controller.update('1', dto);
      expect(result).toEqual({ ...mockTool, name: 'Updated Tool' });
      expect(service.update).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('remove', () => {
    it('should remove a tool', async () => {
      const result = await controller.remove('1');
      expect(result).toEqual(mockTool);
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
