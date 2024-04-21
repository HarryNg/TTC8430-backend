const mongoose = require('mongoose');
const app = require('../app');
const request = require('supertest');
const Album = require('../models/Album');

afterAll(async () => {
  await mongoose.connection.close(); 
  await app.stopServer();
});

describe('Albums API', () => {
  test('Total number of albums should matches the number in test database', async () => {
    // Log in with admin credentials and extract the authentication token
    const loginResponse = await request(app)
      .post('/login')
      .send({ username: 'admin', password: '234' });

    // Extract the authentication token from the login response
    const authToken = loginResponse.body.token;
    
    const albumsCount = await Album.countDocuments();
    // Make a request to the /albums endpoint with the authentication token
    const response = await request(app)
      .get('/albums')
      .set('Authorization', `Bearer ${authToken}`);

    // Assert that the response is successful and returns JSON data
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);

    // Assert the number of albums in the response
    expect(response.body.albums.length).toBe(albumsCount);

  });
});

describe('POST /api/albums', () => {
    test('should add a new album successfully and verify the count', async () => {
      // Log in with admin credentials and extract the authentication token
      const loginResponse = await request(app)
        .post('/login')
        .send({ username: 'admin', password: '234' });
  
      // Extract the authentication token from the login response
      const authToken = loginResponse.body.token;
        
      const albumsCountBefore = await Album.countDocuments();
      // Define a new album to add
      const newAlbum = {
        title: 'New Album',
        artist: 'New Artist',
        year: 2022,
        genre: 'Rock'
      };
  
      // Make a request to add the new album
      const response = await request(app)
        .post('/albums')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAlbum);
  
      // Assert that the response is successful
      expect(response.status).toBe(201);
  
      // Verify that the album count increases by one
      const albumsCountAfter = await Album.countDocuments();
      expect(albumsCountAfter).toBe(albumsCountBefore + 1);
  
      // Verify that the newly added album has the correct data
      const addedAlbum = await Album.findOne({ title: 'New Album' });
      expect(addedAlbum).toBeTruthy();
      expect(addedAlbum.title).toBe('New Album');
      expect(addedAlbum.artist).toBe('New Artist');
      expect(addedAlbum.year).toBe(2022);
      expect(addedAlbum.genre).toBe('Rock');
    });
  });

describe('DELETE /albums/:id', () => {
    test('should delete an existing album successfully', async () => {
        // Log in with admin credentials and extract the authentication token
        const loginResponse = await request(app)
        .post('/login')
        .send({ username: 'admin', password: '234' });

        // Extract the authentication token from the login response
        const authToken = loginResponse.body.token;

        // Create a new album to be deleted
        const newAlbum = new Album({
        title: 'To Be Deleted',
        artist: 'Some Artist',
        year: 2020,
        genre: 'Pop'
        });
        await newAlbum.save();

        // Get the ID of the newly created album
        const albumId = newAlbum._id;

        // Get the count of albums before deletion
        const albumsCountBefore = await Album.countDocuments();

        // Make a request to delete the album
        const response = await request(app)
        .delete(`/albums/${albumId}`)
        .set('Authorization', `Bearer ${authToken}`);

        // Assert that the response is successful
        expect(response.status).toBe(200);

        // Verify that the album count decreases by one
        const albumsCountAfter = await Album.countDocuments();
        expect(albumsCountAfter).toBe(albumsCountBefore - 1);

        // Verify that the specific album is no longer present
        const deletedAlbum = await Album.findById(albumId);
        expect(deletedAlbum).toBeNull();
    });

    test('should gracefully handle attempt to delete a non-existent album', async () => {
        // Log in with admin credentials and extract the authentication token
        const loginResponse = await request(app)
            .post('/login')
            .send({ username: 'admin', password: '234' });
    
        // Extract the authentication token from the login response
        const authToken = loginResponse.body.token;
    
        // Attempt to delete a non-existent album by generating a random valid ObjectId string
        const invalidAlbumId = new mongoose.Types.ObjectId().toHexString();
    
        const response = await request(app)
            .delete(`/albums/${invalidAlbumId}`)
            .set('Authorization', `Bearer ${authToken}`);
    
        // Assert that the response is 404 Not Found
        expect(response.status).toBe(404);
    });
    
});
