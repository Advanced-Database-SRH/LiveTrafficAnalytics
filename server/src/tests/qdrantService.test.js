// 1. Mock the Qdrant client module and keep instances inside the module factory closure
jest.mock('@qdrant/js-client-rest', () => {
    const mockSearchFn = jest.fn();
    const mockGetCollectionsFn = jest.fn();
    const mockCreateCollectionFn = jest.fn();
    const mockCreatePayloadIndexFn = jest.fn();
    const mockUpsertFn = jest.fn();

    return {
        QdrantClient: class {
            constructor() {
                this.search = mockSearchFn;
                this.getCollections = mockGetCollectionsFn;
                this.createCollection = mockCreateCollectionFn;
                this.createPayloadIndex = mockCreatePayloadIndexFn;
                this.upsert = mockUpsertFn;
            }
        },
       
        _mockInstances: {
            search: mockSearchFn,
            getCollections: mockGetCollectionsFn,
            createCollection: mockCreateCollectionFn,
            createPayloadIndex: mockCreatePayloadIndexFn,
            upsert: mockUpsertFn
        }
    };
});

jest.mock('../utils/vectorBuilder', () => ({
    toNumericPointId: jest.fn().mockReturnValue(99999),
    timeToSeconds: jest.fn().mockReturnValue(0)
}));

const { searchMultimodal, upsertVehicle, ensureCollections } = require('../services/qdrantService');

const mockInstances = require('@qdrant/js-client-rest')._mockInstances;

describe('Qdrant Service Layer - Automated Test Matrix', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ensureCollections()', () => {
        it('should execute collection and payload index creation if collection does not exist', async () => {
            mockInstances.getCollections.mockResolvedValue({ collections: [] });
            mockInstances.createCollection.mockResolvedValue({});
            mockInstances.createPayloadIndex.mockResolvedValue({});

            await ensureCollections();

            expect(mockInstances.createCollection).toHaveBeenCalledWith('vehicle_events', expect.objectContaining({
                vectors: {
                    text: { size: 384, distance: 'Cosine' },
                    image: { size: 512, distance: 'Cosine' }
                }
            }));
            expect(mockInstances.createPayloadIndex).toHaveBeenCalledTimes(4);
        });

        it('should bypass creation states if collection already exists', async () => {
            mockInstances.getCollections.mockResolvedValue({ collections: [{ name: 'vehicle_events' }] });

            await ensureCollections();

            expect(mockInstances.createCollection).not.toHaveBeenCalled();
            expect(mockInstances.createPayloadIndex).not.toHaveBeenCalled();
        });
    });

    describe('searchMultimodal() - Hybrid Score Fusion Engine', () => {
        it('should accurately isolate, merge, and apply the +10.0 Intersection Bonus to matching multi-modal ids', async () => {
            const mockImageVector = new Array(512).fill(0.1);
            const mockTextVector = new Array(384).fill(0.2);

            mockInstances.search
                .mockResolvedValueOnce([
                    { id: 99999, score: 0.90, payload: { mongo_id: "60c72b2f9b1d8b2bad123456", vehicle_id: "V101" } }
                ])
                .mockResolvedValueOnce([
                    { id: 99999, score: 0.40, payload: { mongo_id: "60c72b2f9b1d8b2bad123456", vehicle_id: "V101" } }
                ]);

            const results = await searchMultimodal(mockImageVector, mockTextVector, 5);

            expect(mockInstances.search).toHaveBeenCalledTimes(2);
            expect(results).toHaveLength(1);
            
            // Expected Combined Score Verification: 0.90 + 0.40 + 10.0 boost = 11.30
            expect(results[0].score).toBeCloseTo(11.30);
            expect(results[0].fromImage).toBe(true);
            expect(results[0].fromText).toBe(true);
        });

        it('should respect unique thresholds and avoid adding the boost if data points do not intersect', async () => {
            const mockTextVector = new Array(384).fill(0.2);
            
            mockInstances.search.mockResolvedValueOnce([
                { id: 88888, score: 0.75, payload: { mongo_id: "60c72b2f9b1d8b2bad777777", vehicle_id: "V102" } }
            ]);

            const results = await searchMultimodal(null, mockTextVector, 5);

            expect(mockInstances.search).toHaveBeenCalledTimes(1);
            expect(results).toHaveLength(1);
            expect(results[0].score).toBe(0.75);
            expect(results[0].fromText).toBe(true);
            expect(results[0].fromImage).toBeUndefined();
        });
    });
});