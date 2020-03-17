import mongoose from 'mongoose'

const Schema = mongoose.Schema

const GenreSchema = new Schema({
  name: {type: String, required: true, minlength: 3, maxlength: 100}
})

// Виртуальное свойство - url жанра
GenreSchema
  .virtual('url')
  .get(function() {
    return '/catalog/genre/' + this._id
  })

export default mongoose.model('Genre', GenreSchema)
