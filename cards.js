const cards = document.querySelectorAll('.card');
const cardInners = document.querySelectorAll('.card-inner');
const readMoreLinks = document.querySelectorAll('.read-more');
const readLessLinks = document.querySelectorAll('.read-less');

readMoreLinks.forEach((readMoreLink, index) => {
  readMoreLink.addEventListener('click', function(e) {
    e.preventDefault();
    cardInners[index].style.transform = 'rotateY(180deg)';
    readMoreLinks[index].style.display = 'none';
    readLessLinks[index].style.display = 'block';
    cards[index].classList.add('flipped'); // add 'flipped' class to card element
  });
});

readLessLinks.forEach((readLessLink, index) => {
  readLessLink.addEventListener('click', function(e) {
    e.preventDefault();
    cardInners[index].style.transform = 'rotateY(0deg)';
    readMoreLinks[index].style.display = 'block';
    readLessLinks[index].style.display = 'none';
    cards[index].classList.remove('flipped'); // remove 'flipped' class from card element
  });
});
