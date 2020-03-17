import mongoose from 'mongoose'
import moment from 'moment'

moment.locale('ru') // Переключение на русский язык

const Schema = mongoose.Schema

const BookinstanceSchema = new Schema({
  book: {type: Schema.Types.ObjectId, ref: 'Book', required: true}, // Ссылка на книгу
  imprint: {type: String, required: true},
  status: {type: String, required: true, enum: ['Доступен', 'Обслуживание', 'Одолжен', 'Забронирован'], default: 'Обслуживание'},
  dueBack: {type: Date, default: Date.now}
})

// Виртуальное свойство - URL экземпляра книги
BookinstanceSchema
  .virtual('url')
  .get(function() {
    return '/catalog/bookinstance/' + this._id
  })

// Виртуальное свойство - отформатированная дата
BookinstanceSchema
  .virtual('dueBackFormatted')
  .get(function() {
    return moment(this.dueBack).format('Do MMMM YYYY')
  })

// Экспортирование модели
export default mongoose.model('Bookinstance', BookinstanceSchema)
