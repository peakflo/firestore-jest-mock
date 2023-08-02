describe.each([
  { library: '@google-cloud/firestore', mockFunction: 'mockGoogleCloudFirestore' },
  { library: '@react-native-firebase/firestore', mockFunction: 'mockReactNativeFirestore' },
])('mocking %i with %i', ({ library, mockFunction }) => {
  const FirestoreMock = require('firestore-jest-mock');

  const flushPromises = () => new Promise(setImmediate);
  const { Timestamp } = require('../mocks/timestamp');
  const {
    mockGet,
    mockSelect,
    mockAdd,
    mockSet,
    mockUpdate,
    mockWhere,
    mockCollectionGroup,
    mockBatch,
    mockBatchCommit,
    mockBatchDelete,
    mockBatchUpdate,
    mockBatchSet,
    mockBulkWriter,
    mockBulkWriterSet,
    mockBulkWriterClose,
    mockBulkWriterDelete,
    mockBulkWriterUpdate,
    mockSettings,
    mockOnSnapShot,
    mockListCollections,
    mockTimestampNow,
  } = require('../mocks/firestore');

  describe('we can start a firestore application', () => {
    FirestoreMock[mockFunction]({
      database: {
        users: [
          { id: 'abc123', first: 'Bob', last: 'builder', born: 1998 },
          {
            id: '123abc',
            first: 'Blues',
            last: 'builder',
            born: 1996,
            _collections: {
              cities: [
                { id: 'LA', name: 'Los Angeles', state: 'CA', country: 'USA', visited: true },
              ],
            },
          },
        ],
        cities: [
          { id: 'LA', name: 'Los Angeles', state: 'CA', country: 'USA' },
          { id: 'DC', name: 'Disctric of Columbia', state: 'DC', country: 'USA' },
        ],
      },
    });

    beforeEach(() => {
      this.Firestore = require(library).Firestore;
    });

    afterEach(() => mockTimestampNow.mockClear());

    test('We can start an application', async () => {
      const firestore = new this.Firestore();
      firestore.settings({ ignoreUndefinedProperties: true });
      expect(mockSettings).toHaveBeenCalledWith({ ignoreUndefinedProperties: true });
    });

    describe('Examples from documentation', () => {
      test('add a user', () => {
        const firestore = new this.Firestore();

        return firestore
          .collection('users')
          .add({
            first: 'Ada',
            last: 'Lovelace',
            born: 1815,
          })
          .then(function(docRef) {
            expect(mockAdd).toHaveBeenCalled();
            expect(docRef).toHaveProperty('id');
          });
      });

      test('get all users', () => {
        const firestore = new this.Firestore();

        return firestore
          .collection('users')
          .get()
          .then(querySnapshot => {
            expect(querySnapshot.forEach).toBeTruthy();
            expect(querySnapshot.docs.length).toBe(2);
            expect(querySnapshot.size).toBe(querySnapshot.docs.length);

            querySnapshot.forEach(doc => {
              expect(doc.exists).toBe(true);
              expect(doc.data()).toBeTruthy();
            });
          });
      });

      test('select specific fields only', () => {
        const firestore = new this.Firestore();

        return firestore
          .collection('users')
          .select('first', 'last')
          .get()
          .then(querySnapshot => {
            expect(mockSelect).toHaveBeenCalledWith('first', 'last');

            const data = querySnapshot.docs[0].data();
            expect(Object.keys(data).length).toBe(2);
            expect(data.first).toBe('Bob');
            expect(data.last).toBe('builder');
          });
      });

      test('select refs only', () => {
        const firestore = new this.Firestore();

        return firestore
          .collection('users')
          .select()
          .get()
          .then(querySnapshot => {
            expect(mockSelect).toHaveBeenCalledWith();

            const data = querySnapshot.docs[0].data();
            expect(Object.keys(data).length).toBe(0);
          });
      });

      test('collectionGroup at root', () => {
        const firestore = new this.Firestore();

        return firestore
          .collectionGroup('users')
          .where('last', '==', 'builder')
          .get()
          .then(querySnapshot => {
            expect(mockCollectionGroup).toHaveBeenCalledWith('users');
            expect(mockGet).toHaveBeenCalled();
            expect(mockWhere).toHaveBeenCalledWith('last', '==', 'builder');

            expect(querySnapshot.forEach).toBeTruthy();
            expect(querySnapshot.docs.length).toBe(2);
            expect(querySnapshot.size).toBe(querySnapshot.docs.length);

            querySnapshot.forEach(doc => {
              expect(doc.exists).toBe(true);
              expect(doc.data()).toBeTruthy();
            });
          });
      });

      test('collectionGroup with subcollections', () => {
        jest.clearAllMocks();
        const firestore = new this.Firestore();

        return firestore
          .collectionGroup('cities')
          .where('country', '==', 'USA')
          .get()
          .then(querySnapshot => {
            expect(mockCollectionGroup).toHaveBeenCalledWith('cities');
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockWhere).toHaveBeenCalledWith('country', '==', 'USA');

            expect(querySnapshot.forEach).toBeTruthy();
            expect(querySnapshot.docs.length).toBe(3);
            expect(querySnapshot.size).toBe(querySnapshot.docs.length);

            querySnapshot.forEach(doc => {
              expect(doc.exists).toBe(true);
              expect(doc.data()).toBeTruthy();
            });
          });
      });

      test('set a city', () => {
        const firestore = new this.Firestore();

        return firestore
          .collection('cities')
          .doc('LA')
          .set({
            name: 'Los Angeles',
            state: 'CA',
            country: 'USA',
          })
          .then(function() {
            expect(mockSet).toHaveBeenCalledWith({
              name: 'Los Angeles',
              state: 'CA',
              country: 'USA',
            });
          });
      });

      test('updating a city', () => {
        const firestore = new this.Firestore();
        const now = Timestamp._fromMillis(new Date().getTime());
        const washingtonRef = firestore.collection('cities').doc('DC');

        mockTimestampNow.mockReturnValue(now);

        return washingtonRef
          .update({
            capital: true,
          })
          .then(function(value) {
            expect(value.updateTime).toStrictEqual(now);
            expect(mockUpdate).toHaveBeenCalledWith({ capital: true });
          });
      });

      test('bulk writes', () => {
        const firestore = new this.Firestore();

        // Get a new bulk writer
        const bulkWriter = firestore.bulkWriter();

        // Set the value of 'NYC'
        const nycRef = firestore.collection('cities').doc('NYC');
        bulkWriter.set(nycRef, { name: 'New York City' });

        // Update the population of 'SF'
        const sfRef = firestore.collection('cities').doc('SF');
        bulkWriter.update(sfRef, { population: 1000000 });

        // Delete the city 'LA'
        const laRef = firestore.collection('cities').doc('LA');
        bulkWriter.delete(laRef);

        // Commit the bulk Writer
        return bulkWriter.close().then(function() {
          expect(mockBulkWriter).toHaveBeenCalled();
          expect(mockBulkWriterDelete).toHaveBeenCalledWith(laRef);
          expect(mockBulkWriterUpdate).toHaveBeenCalledWith(sfRef, { population: 1000000 });
          expect(mockBulkWriterSet).toHaveBeenCalledWith(nycRef, { name: 'New York City' });
          expect(mockBulkWriterClose).toHaveBeenCalled();
        });
      });

      test('batch writes', () => {
        const firestore = new this.Firestore();

        // Get a new write batch
        const batch = firestore.batch();

        // Set the value of 'NYC'
        const nycRef = firestore.collection('cities').doc('NYC');
        batch.set(nycRef, { name: 'New York City' });

        // Update the population of 'SF'
        const sfRef = firestore.collection('cities').doc('SF');
        batch.update(sfRef, { population: 1000000 });

        // Delete the city 'LA'
        const laRef = firestore.collection('cities').doc('LA');
        batch.delete(laRef);

        // Commit the batch
        return batch.commit().then(function() {
          expect(mockBatch).toHaveBeenCalled();
          expect(mockBatchDelete).toHaveBeenCalledWith(laRef);
          expect(mockBatchUpdate).toHaveBeenCalledWith(sfRef, { population: 1000000 });
          expect(mockBatchSet).toHaveBeenCalledWith(nycRef, { name: 'New York City' });
          expect(mockBatchCommit).toHaveBeenCalled();
        });
      });

      test('listCollections returns a promise', async () => {
        const firestore = new this.Firestore();

        const listCollectionsPromise = firestore
          .collection('cities')
          .doc('LA')
          .listCollections();

        expect(listCollectionsPromise).toEqual(expect.any(Promise));
      });

      test('listCollections resolves with child collections', async () => {
        const firestore = new this.Firestore();

        const result = await firestore
          .collection('users')
          .doc('123abc')
          .listCollections();

        expect(result).toEqual(expect.any(Array));
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(expect.any(this.Firestore.CollectionReference));
        expect(result[0].id).toBe('cities');
      });

      test('listCollections resolves with empty array if there are no collections in document', async () => {
        const firestore = new this.Firestore();

        const result = await firestore
          .collection('users')
          .doc('abc123')
          .listCollections();

        expect(result).toEqual(expect.any(Array));
        expect(result).toHaveLength(0);
      });

      test('listCollections calls mockListCollections', async () => {
        const firestore = new this.Firestore();

        await firestore
          .collection('users')
          .doc('abc123')
          .listCollections();

        expect(mockListCollections).toHaveBeenCalled();
      });

      test('onSnapshot single doc', async () => {
        const firestore = new this.Firestore();
        const now = Timestamp._fromMillis(new Date().getTime());

        mockTimestampNow.mockReturnValue(now);

        firestore
          .collection('cities')
          .doc('LA')
          .onSnapshot(doc => {
            expect(doc).toHaveProperty('createTime');
            expect(doc).toHaveProperty('data');
            expect(doc.data).toBeInstanceOf(Function);
            expect(doc).toHaveProperty('metadata');
            expect(doc).toHaveProperty('readTime');
            expect(doc).toHaveProperty('updateTime');
            expect(doc.readTime).toStrictEqual(now);
          });

        await flushPromises();

        expect(mockOnSnapShot).toHaveBeenCalled();
      });

      test('onSnapshot can work with options', async () => {
        const firestore = new this.Firestore();
        const now = Timestamp._fromMillis(new Date().getTime());

        mockTimestampNow.mockReturnValue(now);

        firestore
          .collection('cities')
          .doc('LA')
          .onSnapshot(
            {
              // Listen for document metadata changes
              includeMetadataChanges: true,
            },
            doc => {
              expect(doc).toHaveProperty('createTime');
              expect(doc).toHaveProperty('data');
              expect(doc.data).toBeInstanceOf(Function);
              expect(doc).toHaveProperty('metadata');
              expect(doc).toHaveProperty('readTime');
              expect(doc).toHaveProperty('updateTime');
              expect(doc.readTime).toStrictEqual(now);
            },
          );

        await flushPromises();

        expect(mockOnSnapShot).toHaveBeenCalled();
      });

      test('onSnapshot with query', async () => {
        const firestore = new this.Firestore();

        const unsubscribe = firestore
          .collection('cities')
          .where('state', '==', 'CA')
          .onSnapshot(querySnapshot => {
            expect(querySnapshot).toHaveProperty('forEach', expect.any(Function));
            expect(querySnapshot).toHaveProperty('docChanges');
            expect(querySnapshot).toHaveProperty('docs', expect.any(Array));

            expect(querySnapshot.forEach).toBeInstanceOf(Function);
            expect(querySnapshot.docChanges).toBeInstanceOf(Function);
            expect(querySnapshot.docs).toBeInstanceOf(Array);

            expect(querySnapshot.docChanges()).toBeInstanceOf(Array);
          });

        await flushPromises();

        expect(unsubscribe).toBeInstanceOf(Function);
        expect(mockWhere).toHaveBeenCalled();
        expect(mockOnSnapShot).toHaveBeenCalled();
      });
    });
  });
});
