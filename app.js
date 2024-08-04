const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
app.use(express.json());

app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render("index");
});

app.get('/profile', isLoggedIn, async (req,res)=>{
    let user= await userModel.findOne({email:req.user.email}).populate("posts");
  
    res.render("profile",{user});
})


app.get('/like/:id', isLoggedIn, async (req,res)=>{
    let post= await postModel.findOne({_id:req.params.id}).populate("user");
    post.likes = post.likes || [];
    if(post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid);
   
    }
    else
    {
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();
    res.redirect("/profile");
})

app.get('/edit/:id', isLoggedIn, async (req,res)=>{
    let post= await postModel.findOne({_id:req.params.id}).populate("user");
   
    res.render("edit",{post});
   
})

app.post('/update/:id', isLoggedIn, async (req,res)=>{
    let post= await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content});
    res.redirect("/profile");
   
   
})



app.post('/post', isLoggedIn, async (req,res)=>{
    let user= await userModel.findOne({email:req.user.email});
    let {content}=req.body;
    let post= await postModel.create({
    user: user._id,
    content
   });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
})


app.post('/register', async (req, res) => {
  try {
    let { email, password, username, name, age } = req.body;
    let user = await userModel.findOne({ email });
    if (user) {
      res.send("User already exists");
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    password = hash;

    user = userModel({ username, email, age, name, password });
    await user.save();

    let token = jwt.sign({ email: email, userid: user._id }, "shhhhhh");
    res.cookie("token", token);

    res.send("User created successfully");
  } catch (err) {
    console.log(err);
    res.send("Error creating user");
  }
});
app.get('/login', (req, res) => {
    res.render("login");
  });
  

  app.post('/login', async (req, res) => {
    try {
      let { email, password } = req.body;
      let user = await userModel.findOne({ email });
      if (!user) {
        res.send("User not found");
      } else {
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          res.send("Invalid password");
        } else {
          let token = jwt.sign({ email: email, userid: user._id }, "shhhhhh");
          res.cookie("token", token);
          res.send("Logged in successfully");
        }
      }
    } catch (err) {
      console.log(err);
      res.send("Error logging in");
    }
});

app.get('/logout',(req,res)=>{
    res.clearCookie('token');
    console.log("Right logout route");
    res.redirect('/');
})

function isLoggedIn(req,res,next){
    if(!req.cookies.token)
    {
        res.render("/login");
    }
    else
    {
       let data=jwt.verify(req.cookies.token,"shhhhhh");
       req.user=data;
       next();
    }
   
}






app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
