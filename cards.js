const card = document.querySelector('.card');
const cardInner = document.querySelector('.card-inner');
const readMoreLink = document.querySelector('.read-more');
const readLessLink = document.querySelector('.read-less');

readMoreLink.addEventListener('click', function(e) {
  e.preventDefault();
  cardInner.style.transform = 'rotateY(180deg)';
  readMoreLink.style.display = 'none';
  readLessLink.style.display = 'block';
});

readLessLink.addEventListener('click', function(e) {
  e.preventDefault();
  cardInner.style.transform = 'rotateY(0deg)';
  readMoreLink.style.display = 'block';
  readLessLink.style.display = 'none';
});



    