var tools = {
  strtotime: function (dateTimeStr) {
    return new Date(dateTimeStr.replace(/-/g, '/')).getTime()
  },
  array_unique: function (arr) {
    return arr.filter(function(element, index, self) {
      return self.indexOf(element) === index
    })
  }
}

export default tools
