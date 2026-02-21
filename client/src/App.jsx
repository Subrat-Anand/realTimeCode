import { useEffect, useRef, useState } from 'react';
import './App.css';
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';

const socket = io('http://localhost:3000');

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding...');
  const [copySuccess, setCopySuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState("");

  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (name) => {
      if(name !== username) {
        setTypingUsers(name);
      }
    });

    socket.on("userStopTyping", () => {
      setTypingUsers("");
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("userStopTyping");
      socket.off("languageUpdate");
      }
  }, []);
  
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      socket.emit("leave");
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, []);

  const joinRoom = () => {
    if(!roomId.trim() || !username.trim()) return;
    
    if(roomId.trim() && username.trim()){
      socket.emit("join", { roomId, username });
      setJoined(true);
    }
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("copied!");
    setTimeout(() => {
      setCopySuccess("");
    }, 2000);
  };

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit("codeChange", { roomId, code: value });
    
    // 🔥 TYPING START
    socket.emit("typing", { roomId, username });

    // 🔥 STOP TYPING AFTER 1.5 SEC
    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { roomId });
    }, 1500);
  }

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  }

  const leaveRoom = () => {
    socket.emit("leave");
    setJoined(false);
    setRoomId('');
    setUsername('');
    setCode('// Start coding...');
    setLanguage('javascript');
  }

  if (!joined) {
    return(
      <div className='join-container'>
        <div className='join-form'>
          <h1>Join Room Code</h1>
          <input 
            type="text" 
            placeholder='Enter Room Code' 
            value={roomId}
            onChange={(e)=> setRoomId(e.target.value)}
          />
          <input 
            type="text" 
            placeholder='Enter Username' 
            value={username}
            onChange={(e)=> setUsername(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </div>
      </div>
    );
  }

  return(
    <div className='editor-container'>
      <div className='sidebar'>
        <div className='room-info'>
          <h2>Code Room: {roomId}</h2>
          <button onClick={copyRoomId} className='copy-btn'>Copy I'd</button>
          {copySuccess && <span className='copy-success'>{copySuccess}</span>}
        </div>
        <h3>Users in Room:</h3>
        <ul>
          {users.map((user, index) => (
            <li key={index}>{user.slice(0, 8)}</li>
          ))}
        </ul>

        <p className='typing-indicator'>{typingUsers}</p>

        <select className='language-selector'
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
          <option value="cpp">C++</option>
        </select>
        <div className='leave-btn' onClick={leaveRoom}>Leave Room</div>
      </div>

      <div className='editor-wrapper'>
        <Editor
          height="100vh"
          language={language} 
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          options={
            {
              minimap: {enabled: false},
              fontSize: 14
            }
          }
        />
      </div>

    </div>
  );
}

export default App