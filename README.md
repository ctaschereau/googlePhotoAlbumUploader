# googlePhotoAlbumUploader

This is a very simple solution to something that I believe should be part of Google Photos : uploading a folder and creating a photo album for all sub-folders.

## Installation

Start by installing the project's dependencies :
```bash
npm install
```

You also need to have a Google API client ID and secret in order to use the API. To create one :
1.  Go to : [Google API Console](https://console.developers.google.com/).
2.  Create a project (ex : googlePhotoAlbumUploader).
3.  Create OAuth client ID
    1.  Choose *Web application* as the _application type_
    2.  Choose a name (ex : googlePhotoAlbumUploader)
    3.  Set your _Authorised JavaScript origins_ to *http://localhost:3000*
    4.  Set you _Authorised redirect URIs_ to *http://localhost:3000/oauth2callback*
4.  Take note of your client ID and client secret.
5.  Create a _.env_ file using the _.env.example_ template file.
6.  Fill the client ID and client secret values with your values.

## Usage

Launch the script by giving it a full path to a folder that contains subfolders that are meant to be uploaded as photo albums.

```bash
node main.js /home/my_user/path/to/my/albums/folder
```