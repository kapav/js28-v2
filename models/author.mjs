import mongoose from 'mongoose'
import moment from 'moment'

moment.locale('ru') // Переключение на русский язык

const Schema = mongoose.Schema

const AuthorSchema = new Schema({
  firstName: {type: String, required: true, maxlength: 100},
  familyName: {type: String, required: true, maxlength: 100},
  dateOfBirth: {type: Date},
  dateOfDeath: {type: Date}
})

// Виртуальное свойство для полного имени автора
AuthorSchema
  .virtual('name')
  .get(function() {
    return this.familyName + ', ' + this.firstName
  })

// Виртуальное свойство - URL автора
AuthorSchema
  .virtual('url')
  .get(function() {
    return '/catalog/author/' + this._id
  })

// Виртуальное свойство - отформатированная дата рождения
AuthorSchema
  .virtual('dateOfBirthFormatted')
  .get(function() {
    return this.dateOfBirth ?
      moment(this.dateOfBirth).format('Do MMMM YYYY') : ''
  })

// Виртуальное свойство - отформатированная дата смерти
AuthorSchema
  .virtual('dateOfDeathFormatted')
  .get(function() {
    return this.dateOfDeath ?
      moment(this.dateOfDeath).format('Do MMMM YYYY') : ''
  })

// Виртуальное свойство - с датами рождения и смерти
AuthorSchema
  .virtual('lifeSpan')
  .get(function() {
    return this.dateOfBirthFormatted + ' - ' + this.dateOfDeathFormatted
  })

// Экспортирование модели
export default mongoose.model('Author', AuthorSchema)
