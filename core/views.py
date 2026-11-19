from django.shortcuts import render
from django.templatetags.static import static

# Front-end only: sample listings stand in for a database.
LISTINGS = [
    dict(id=1, title="Everyday ribbed tank", price=35, condition="Pre-loved", grade="Like new", type="both",
         category="Clothing", size="S–M", color="Beige", seller="Alwina M.", rating=4.9, tone="#d9c3b0", photo="tank.jpg",
         desc="Gently used ribbed tank in beige. Clean and ready for a new home. Open to swapping for a top.",
         looking="A top, size S–M"),
    dict(id=2, title="Blue ruched dress", price=None, condition="Pre-loved", grade="Like new", type="trade",
         category="Clothing", size="S", color="Blue", seller="Janelle R.", rating=4.8, tone="#2f56d6", photo="blue-dress.jpg",
         desc="Bright blue ruched dress, worn twice. Looking to swap rather than sell.",
         looking="A mini bag"),
    dict(id=3, title="Crochet striped top", price=100, condition="Pre-loved", grade="Good", type="sale",
         category="Clothing", size="M", color="Black & white", seller="Mika D.", rating=4.7, tone="#3a3a3a", photo="crochet.jpg",
         desc="Handmade-style crochet top. A few loose threads, otherwise in good shape.", looking=""),
    dict(id=4, title="White short-sleeve blazer dress", price=150, condition="New", grade="Unworn", type="both",
         category="Clothing", size="M", color="White", seller="Alwina M.", rating=4.9, tone="#eceae6", photo="white-dress.jpg",
         desc="Unworn, size M. Campus meetups.", looking="A crochet top, size S–M"),
    dict(id=5, title="Kids pre-loved set (4–5T)", price=8, condition="Pre-loved", grade="Good", type="sale",
         category="Clothing", size="4–5T", color="Lilac", seller="Rey T.", rating=4.6, tone="#c9a77c", photo="kids-set.jpg",
         desc="Cherry-print tee with lilac pants. Washed and ready.", looking=""),
    dict(id=6, title="Black quilted shoulder bag", price=50, condition="Pre-loved", grade="Good", type="both",
         category="Other", size="—", color="Black", seller="Nadia P.", rating=4.9, tone="#c9ccd6", photo="quilted-bag.jpg",
         desc="Quilted bag with chain strap. Some light wear on the corners.", looking="A tote bag"),
    dict(id=7, title="Pre-loved tops bundle", price=35, condition="Pre-loved", grade="Like new", type="sale",
         category="Clothing", size="S–M", color="Mixed", seller="Carlo V.", rating=4.5, tone="#a8a29a", photo="tops-bundle.jpg",
         desc="Bundle of tops and corset-style pieces. Price is per item.", looking=""),
    dict(id=8, title="Crossbody bags (set of 2)", price=120, condition="Pre-loved", grade="Good", type="both",
         category="Other", size="—", color="Black", seller="Ina S.", rating=4.8, tone="#e4e2e0", photo="crossbody-bags.jpg",
         desc="Two small crossbody bags, one structured and one velvet.", looking="A backpack"),
]

CATEGORIES = ["Clothing", "Books", "Uniforms", "Gadgets", "School supplies", "Other"]


def splash(request):
    return render(request, "core/splash.html")


def login_page(request):
    return render(request, "core/login.html")


def discover(request):
    return render(request, "core/discover.html", {"listings": [dict(i, photo=static("core/img/items/" + i["photo"])) for i in LISTINGS], "active": "discover"})


def create_listing(request):
    return render(request, "core/create.html", {"categories": CATEGORIES, "active": "create"})

