import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeResizer } from '@xyflow/react';

function ResizableGroup({ data, selected }) {
  return (
    <>
      <NodeResizer
        isVisible={selected}   // 只在选中时显示拖拽手柄
        minWidth={150}
        minHeight={100}
      />
      <div style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: 12 }}>
        {data.label}
      </div>
    </>
  );
}

const nodeTypes = {
  resizableGroup: ResizableGroup,
};

// 1. 定义系统架构的节点 (Nodes)
const initialNodes = [
  {
    id: 'group-collect',
    type: 'resizableGroup', // 使用自定义的可调整大小的节点类型
    position: { x: -30, y: 0 },
    style: {
      width: 500,
      height: 220,
      backgroundColor: 'rgba(76,175,80,0.08)',
      border: '2px solid #4CAF50',
      borderRadius: 8,
    },
    data: { label: '采集层' },
  },
  {
    id: 'group-aws',
    type: 'resizableGroup', // 使用自定义的可调整大小的节点类型
    position: { x: -30, y: 340 },
    style: {
      width: 500,
      height: 220,
      backgroundColor: 'rgba(76,175,80,0.08)',
      border: '2px solid #2196F3',
      borderRadius: 8,
    },
    data: { label: 'AWS云' },
  },
  {
    id: 'group-alert',
    type: 'resizableGroup', // 使用自定义的可调整大小的节点类型
    position: { x: -30, y: 760 },
    style: {
      width: 500,
      height: 220,
      backgroundColor: 'rgba(76,175,80,0.08)',
      border: '2px solid #F44336',
      borderRadius: 8,
    },
    data: { label: '告警层' },
  },
  { id: 'bracelet', data: { label: '手环-模拟心率/gps定位/陀螺仪' }, style: { background: '#4CAF50', color: '#fff', border: 'none' }, parentId: 'group-collect', extent: 'parent', position: { x: 30, y: 50 } },
  { id: 'raspberry-pi', data: { label: '树莓派- 模拟温湿度/火焰监测器' }, style: { background: '#4CAF50', color: '#fff', border: 'none' }, parentId: 'group-collect', extent: 'parent', position: { x: 160, y: 50 } },
  { id: 'mqtt', data: { label: 'MQTT协议' }, position: { x: 0, y: 260 }, style: { background: '#2196F3', color: '#fff', border: 'none' } },
  { id: 'iot-core', data: { label: 'AWS IoT Core' }, position: { x: 120, y: 40 }, style: { background: '#2196F3', color: '#fff', border: 'none' }, parentId: 'group-aws', extent: 'parent' },
  { id: 'lambda', data: { label: 'AWS Lambda' }, position: { x: 120, y: 140 }, style: { background: '#2196F3', color: '#fff', border: 'none' }, parentId: 'group-aws', extent: 'parent' },
  { id: 'dynamodb', data: { label: 'DynamoDB' }, position: { x: 120, y: 240 }, style: { background: '#2196F3', color: '#fff', border: 'none' }, parentId: 'group-aws', extent: 'parent' },
  { id: 'sms', data: { label: 'SMS服务' }, position: { x: 40, y: 50 }, style: { background: '#2196F3', color: '#fff', border: 'none' }, parentId: 'group-aws', extent: 'parent' },
  { id: 'mobile-app', data: { label: '移动APP-接收告警通知' }, position: { x: 120, y: 50 }, style: { background: '#F44336', color: '#fff', border: 'none' }, parentId: 'group-alert', extent: 'parent' },
  { id: 'home-inside', data: { label: '带麦报警按钮-语音联动/主动警报' }, position: { x: 200, y: 50 }, style: { background: '#F44336', color: '#fff', border: 'none' }, parentId: 'group-alert', extent: 'parent' },
];


// 2. 定义信息流动的连线 (Edges)
const initialEdges = [
  {
    id: 'e-bracelet-mqtt',  // 唯一 id，习惯用 'e-' 前缀
    source: 'bracelet',     // 从哪个节点出发（用节点的 id）
    target: 'mqtt',         // 到哪个节点结束
    animated: true,         // 连接线是否动画
    type: 'smoothstep'
  },
  {
    id: 'e-raspberry-pi-mqtt',
    source: 'raspberry-pi',
    target: 'mqtt',
    animated: true,
    type: 'smoothstep'
  },
  {
    id: 'e-mqtt-iot-core',
    source: 'mqtt',
    target: 'iot-core',
    animated: true,
    type: 'smoothstep'
  },
  {
    id: 'e-iot-core-lambda',
    source: 'iot-core',
    target: 'lambda',
    animated: true,
    type: 'smoothstep'
  },
  // lambda → dynamodb（写入）
  {
    id: 'e-lambda-dynamodb',
    source: 'lambda',
    target: 'dynamodb',
    type: 'smoothstep',
    animated: true,
    pathOptions: { offset: 20 },   // 向右偏移
  },


  {
    id: 'e-lambda-sms',
    source: 'lambda',
    target: 'sms',
    animated: true,
    type: 'smoothstep'
  },
  {
    id: 'e-lambda-home-inside',
    source: 'lambda',
    target: 'home-inside',
    animated: true,
    type: 'smoothstep'
  },
  {
    id: 'e-sms-mobile-app',
    source: 'sms',
    target: 'mobile-app',
    animated: true,
    type: 'smoothstep'
  },
];

export default function App() {

  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('flow-nodes');
    return saved ? JSON.parse(saved) : initialNodes;
  });

  const [edges, setEdges] = useState(() => {
    const saved = localStorage.getItem('flow-edges');
    return saved ? JSON.parse(saved) : initialEdges;
  });

  const onConnect = useCallback((connection) => {
    setEdges((eds) => {
      const updated = addEdge(connection, eds);
      localStorage.setItem('flow-edges', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      localStorage.setItem('flow-nodes', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const updated = applyEdgeChanges(changes, eds);
      localStorage.setItem('flow-edges', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem('flow-nodes');
    localStorage.removeItem('flow-edges');
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, []);


  return (
    // 画板必须有一个明确的宽高，否则无法显示
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView // 自动缩放以适应屏幕
        onConnect={onConnect} // 连接新边的回调
        nodeTypes={nodeTypes}
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
        <Panel position="top-right">
          <button onClick={handleReset} style={{
            padding: '6px 12px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            cursor: 'pointer',
          }}>
            重置布局
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}