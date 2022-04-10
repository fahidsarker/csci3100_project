import {
  getAuth,
  sendEmailVerification,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth, user } from './firebase_auth'
//backend server url
const baseURL = 'http://localhost:8080'

/*
 * Check if user is logged in
 * returns true is user is logged in, false otherwise
 * todo : implementation
 *  @deprecated Use the getUserDetails to check information
 *
 * */
export async function isUserLoggedIn() {
  return (await getUserDetails()).success === true
}

/*
 * Get the  user Detals
 * Object Must include:
 * name, userID, photoURL
 *
 * Return null if user is not logged in
 *
 * overload: implementation
 *  if userID is null => query current logined user
 *  else => query userID
 * */
export async function getUserDetails(userID = null) {
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/queryuser', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ userid: userID || user.uid }),
    })
    let resBody = await res.json()
    console.log('debug get UserDetails\n', resBody)
    return {
      success: true,
      isVerified: resBody.isVerified, //whether the user being queried is verified
      name: resBody.Content.name,
      userID: userID || user.uid,
      isAdmin: resBody.Content.role === 'admin',
      photoURL:
        resBody.Content.profile_icon ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlcnxlbnwwfHwwfHw%3D&w=1000&q=80',
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/**
 * helper function to signUp
 * create a user profile at the database
 * @returns success, (response or error)
 *
 */
async function createUser() {
  console.log('userid:', await user.getIdToken())
  let token = await user.getIdToken()
  let res = await fetch(baseURL + '/register', {
    method: 'POST',
    mode: 'cors', // no-cors, *cors, same-origin
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: token,
    },
    // empty body
    body: JSON.stringify({}),
  })
  //DEBUG
  let resBody = await res.json()
  console.log('createUser()', resBody)
  if (res.status != 300) {
    //error in backend side
    return { success: false, error: resBody }
  }
  return { success: true, response: resBody }
}

/*
 * send verification to current user
 * return true if success
 */
export async function sendVerificationEmail() {
  if (user == null) return { success: false, error: 'user==null' }
  try {
    let res = await sendEmailVerification(user)
    return { success: true, response: res }
  } catch (e) {
    return { success: false, error: e }
  }
}

/*
 * Sign in with username and password
 * returns true if successful
 *
 * */
export async function signIn(userName, password) {
  console.log('Sign in with: ', userName, password)
  try {
    let userCredential = await signInWithEmailAndPassword(
      auth,
      userName,
      password,
    )
    if (userCredential) {
      console.log({ logined: userCredential })
      return { success: true, userCredential: userCredential }
    } else {
      return { success: false, error: 'unknown error' }
    }
  } catch (error) {
    console.log({ errorCode: error.code, errorMessage: error.message })
    return { success: false, error: error.code }
  }
}

/*
 * Sign up with username and password
 * returns true if successful
 *
 * */
export async function signUp(userName, password) {
  console.log('Sign up with: ', userName, password)
  try {
    let userCredential = await createUserWithEmailAndPassword(
      auth,
      userName,
      password,
    )
    if (userCredential) {
      //registered
      console.log({ registered: userCredential })
      //send verification email
      let sent = await sendVerificationEmail()
      if (sent.success === false) {
        console.log('fail to send verification email', sent.error)
        return { success: false, error: 'fail to send verification email' }
      } else {
        let create = await createUser()
        if (create.success === false) {
          console.log('failed to create user profile')
          return { success: false, error: 'fail to create user profile' }
        } else {
          return { success: true, userCredential: userCredential }
        }
      }
    } else {
      return { success: false, error: 'unknown error' }
    }
  } catch (error) {
    console.log({ errorCode: error.code, errorMessage: error.message })
    return { success: false, error: error.code }
  }
}

/*
 * Returns the google doc link as a string
 * **/
export async function getGoogleDocLink(groupID) {
  console.log('Get Doc Link')
  //get google docLink
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/getgoogledoc', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      body: new URLSearchParams({ groupID: groupID }),
    })
    let resBody = res.json()
    if (res.status === 401) {
      //not a global admin OR not a member in the private group
      return { success: false, error: resBody, unauthorized: true }
    }
    return {
      success: true,
      content: {
        docsLink: resBody,
      },
    }
  } catch (e) {
    return { success: false, error: e }
  }

  //dummy google doc link
  return 'https://docs.google.com/document/d/1OFISOmBrpAjoT4mt1wozwxy1XXoXRuwXne33s06SE1k/edit?usp=sharing'
}

/*
 * returns google sheet link as a string
 * **/
export async function getGoogleSheetLink(groupID) {
  console.log('Get Sheet Link')
  //get google sheetlink
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/getgooglesheet', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      body: new URLSearchParams({ groupID: groupID }),
    })
    let resBody = res.json()
    if (res.status === 401) {
      //not a global admin OR not a member in the private group
      return { success: false, error: resBody, unauthorized: true }
    }
    return {
      success: true,
      content: {
        sheetLink: resBody,
      },
    }
  } catch (e) {
    return { success: false, error: e }
  }
  return 'https://drive.google.com/drive/folders/1iLYilbLLKIbYKOR3xvhRuOTj3m_gfP75'
}

export async function getGoogleDriveLink(groupID) {
  return 'https://drive.google.com/drive/folders/1iLYilbLLKIbYKOR3xvhRuOTj3m_gfP75'
}

/**
 * Returns google sheet link as a string
 * **/

export async function getGooglePresLink(groupID) {
  console.log('Get Pres Link')
  //get google presLink
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/getgooglepres', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      body: new URLSearchParams({ groupID: groupID }),
    })
    let resBody = res.json()
    if (res.status === 401) {
      //not a global admin OR not a member in the private group
      return { success: false, error: resBody, unauthorized: true }
    }
    return {
      success: true,
      content: {
        presLink: resBody,
      },
    }
  } catch (e) {
    return { success: false, error: e }
  }
  return 'https://docs.google.com/spreadsheets/d/1qZ_ejiZnkZyUATXvau2xPVkCkmJC0uectTemLU-bx0o/edit?usp=sharing'
}

/*
 * Sends a new Message to the server
 *
 * Note object contains params provided in the getUserDetails function
 *
 * todo: implementation
 * **/
export async function sendMessage(message, groupID, user) {
  console.log('sendMessage: ', message, groupID, user)
  // promise fake wait
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

export async function getJoinAbleZoomMeetingLink(userID, groupID) {
  try {
    //user === null if the user is not logged in
    if (!userID) console.log('WARNING!!!!!!!!!!!!!!!!!!!!!, no user logged in')
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/getZoom', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
    })
    let resBody = await res.json()
    console.log(resBody)
    return {
      success: true,
      response: `${resBody.StartURL}, ${resBody.JoinURL}`,
    }
  } catch (e) {
    console.log('getJoinAbleZoomMeetingLink() failed:\n', e)
    return { success: false, error: e }
  }
  //return 'https://zoom.us/j/908724981'
}

/**
 * get Group Chats
 * each message must contain name, text, timeStamp, and photoURL
 */
export async function getGroupChats(groupID) {
  // here are some 30 fake messages with some random google images as profileurl
  return [
    {
      name: 'John Doe',
      text: 'Hello, how are you?',
      timeStamp: '1:00',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'I am fine, thank you!',
      timeStamp: '1:01',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'How are you?',
      timeStamp: '1:02',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'I am fine, thank you!',
      timeStamp: '1:03',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'How are you?',
      timeStamp: '1:04',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'I am fine, thank you!',
      timeStamp: '1:05',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    // 20 more
    {
      name: 'John Doe',
      text: 'How are you?',
      timeStamp: '1:06',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'I am fine, thank you!',
      timeStamp: '1:07',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'How are you?',
      timeStamp: '1:08',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'I am fine, thank you!',
      timeStamp: '1:09',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'How are you?',
      timeStamp: '1:10',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
    {
      name: 'John Doe',
      text: 'I am fine, thank you!',
      timeStamp: '1:11',
      photoURL:
        'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=50',
    },
  ]
}

/*
 * Returns the group details:
 * Must contain name, description, photoURL
 * if you want to get the group content by groupname, just change it inside the body
 * e.g. body: new URLSearchParams({groupname:groupName})
 * */
export async function getGroupDetails(groupID) {
  //this is just a dummy photo
  let dummyIcon =
    'https://cdn.pixabay.com/photo/2017/11/10/05/46/group-2935521_960_720.png'

  // return {
  //     name: 'debug ',
  //     description: 'de-ing bug',
  //     photoURL: dummyIcon,
  //     id: 0
  // };

  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/querygroup', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      body: new URLSearchParams({ groupid: groupID }),
    })
    let resBody = res.json()
    if (res.status === 401) {
      //not a global admin OR not a member in the private group
      return { success: false, error: resBody, unauthorized: true }
    }
    return {
      success: true,
      content: {
        name: resBody.Succeed.Content.name,
        description: resBody.Succeed.Content.description,
        photoURL: resBody.Succeed.Content.group_icon || dummyIcon,
        id: groupID,
      },
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/*
 * Logs user out of the app
 * **/
export async function logout() {
  try {
    let signout = await signOut(auth)
    return { success: true, response: 'logout' }
  } catch (error) {
    console.log({ errorCode: error.code, errorMessage: error.message })
    return { success: false, error: error.code }
  }
}

/**
 * Load All the groups the user is a member of
 *
 * if userID is null => query current logined user
 *  else => query userID
 *
 * implementation: 1. get user's groups --> get group's content
 *
 * TODO
 * **/
export async function getJoinedGroups(userID = null) {
  return {
    success: true,
    response: [
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 2',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 3',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 4',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
      {
        name: 'CSCI Proj 5',
        description: 'smt',
        photoURL: 'asd',
        id: 'asd',
      },
    ],
  }

  //get user's groups
  try {
    //user === null if the user is not logged in
    if (!userID) console.log('WARNING!!!!!!!!!!!!!!!!!!!!!, no user logged in')
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/queryusergroup', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ userid: userID || user.uid }),
    })
    let resBody = await res.json()
    console.log(resBody)
    if (resBody.Error) {
      return { success: false, error: resBody.Error }
    }
    let groups = resBody.Content

    let groupContent = []
    console.log(groups)
    for (let i = 0; i < groups.length; i++) {
      groupContent.push({
        name: groups[i].name,
        description: groups[i].description,
        photoURL: groups[i].group_icon || '',
        id: groups[i].groupid,
      })
    }
    return { success: true, response: groupContent }
  } catch (e) {
    console.log('getJoinedGroups() failed:\n', e)
    return { success: false, error: e }
  }
}

/**
 * ban user (ADMIN function)
 */
export async function banUser(userID = null) {
  if (!userID) {
    return { success: false, error: 'userID cant be null' }
  }
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/queryuser', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ userid: userID }),
    })
    let resBody = await res.json()
    console.log('debug get banUser\n', resBody)
    if (res.status === 200) {
      return {
        success: true,
        updatedProfile: resBody.Content,
      }
    } else {
      return { success: false, error: resBody }
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/**
 * delete group (ADMIN function)
 * param: groupID
 * return: success:true/false
 */
export async function deleteGroup(groupID) {
  if (!groupID) {
    return { success: false, error: 'groupID cant be null' }
  }
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/deletegroup', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ groupid: groupID }),
    })
    let resBody = await res.json()
    console.log('debug delete Group\n', resBody)
    if (res.status === 200) {
      return {
        success: true,
      }
    } else {
      return { success: false, error: resBody }
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/**
 * getAllGroups (ADMIN function)
 * remark: it will get all groups that a user is authorized to access
 *  if the user is an admin, basically he can get all groups
 *
 */
export async function getAllGroups() {
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/listgroup', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ dummy: null }),
    })
    let resBody = await res.json()
    console.log('debug get getAllGroups\n', resBody)
    if (res.status === 200) {
      return {
        success: true,
        groups: resBody.Succeed.groups,
      }
    } else {
      return { success: false, error: resBody }
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/**
 * join group
 * - add current user to the group of groupID
 * params: groupID
 */
export async function joinGroup(groupID) {
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/joingroup', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ groupid: groupID }),
    })
    let resBody = await res.json()
    if (res.status === 200) {
      return { success: true }
    } else {
      return { success: false, error: resBody }
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/**
 * leave group
 * - kick the user from the group of groupID
 * params: groupID
 */
export async function leaveGroup(groupID) {
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/leavegroup', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ groupid: groupID }),
    })
    let resBody = await res.json()
    if (res.status === 200) {
      return { success: true }
    } else {
      return { success: false, error: resBody }
    }
  } catch (e) {
    return { success: false, error: e }
  }
}

/**
 * kick user (can only be done by local group admin)
 * - kick the user of userID from the group of groupID
 * params: groupID, userID
 */
export async function kickUser(userID, groupID) {
  try {
    let token = await user.getIdToken()
    let res = await fetch(baseURL + '/apis/kickuser', {
      method: 'POST',
      mode: 'cors', // no-cors, *cors, same-origin
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: token,
      },
      // current userID => user.uid
      body: new URLSearchParams({ groupid: groupID, uid: userID }),
    })
    let resBody = await res.json()
    if (res.status === 200) {
      return { success: true }
    } else {
      return { success: false, error: resBody }
    }
  } catch (e) {
    return { success: false, error: e }
  }
}
