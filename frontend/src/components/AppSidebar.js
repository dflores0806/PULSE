import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBarChart,
  cilHome,
  cilSettings,
  cilMagnifyingGlass,
  cilChatBubble,
  cilMemory,
  cilSpeedometer,
  cilVector,
  cibGithub,
  cilHistory
} from '@coreui/icons'
import { CNavTitle } from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import PulseLogo from 'src/assets/brand/logo_b.png'
import { sygnet } from 'src/assets/brand/sygnet'

import { useModel } from '../context/ModelContext'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  const model = useModel()

  const navItems = [
    {
      component: 'CNavItem',
      name: 'Home',
      to: '/',
      icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'PUE Models',
    },
    {
      component: 'CNavItem',
      name: 'Model generator',
      to: '/puemodels/generator',
      icon: <CIcon icon={cilMemory} customClassName="nav-icon" />,
    },
    {
      component: 'CNavItem',
      name: 'Auto ML generator',
      to: '/puemodels/automl',
      icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    },
    {
      component: 'CNavItem',
      name: 'Model explorer',
      to: '/puemodels/explorer',
      icon: <CIcon icon={cilMagnifyingGlass} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'PUE APPS',
    },
    {
      component: 'CNavItem',
      name: 'Predictor',
      to: '/pueapps/predictor',
      icon: <CIcon icon={cilBarChart} customClassName="nav-icon" />,
      disabled: !model,
    },
    {
      component: 'CNavItem',
      name: 'Simulator',
      to: '/pueapps/simulator',
      icon: <CIcon icon={cilVector} customClassName="nav-icon" />,
      disabled: !model,
    },
    {
      component: 'CNavItem',
      name: 'LLM',
      to: '/pueapps/llm',
      icon: <CIcon icon={cilChatBubble} customClassName="nav-icon" />,
      disabled: !model,
    },
    {
      component: 'CNavItem',
      name: 'History',
      to: '/pueapps/history',
      icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
      disabled: !model,
    },
    {
      component: CNavTitle,
      name: 'Configuration',
    },
    {
      component: 'CNavItem',
      name: 'Settings',
      to: '/settings',
      icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    },
    {
      component: CNavTitle,
      name: 'Docs',
    },
    {
      component: 'CNavItem',
      name: 'GitHub',
      to: 'https://github.com/dflores0806/PULSE',
      icon: <CIcon icon={cibGithub} customClassName="nav-icon" />,
    }
  ]


  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          {/*<CIcon customClassName="sidebar-brand-full" icon={logo} height={32} />*/}
          <img src={PulseLogo} alt="PULSE" height={32} />
          <CIcon customClassName="sidebar-brand-narrow" icon={sygnet} height={32} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navItems} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
